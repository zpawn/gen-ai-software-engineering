# Plan 006: CORS allowlist, LIKE-wildcard escaping, and bounded import payloads

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1fdba3b..HEAD -- homework-2/backend/src/app.ts homework-2/backend/src/modules/tickets/ticket.repository.ts homework-2/backend/src/modules/tickets/ticket.schema.ts homework-2/backend/tests/`
> If any in-scope file changed, compare "Current state" excerpts against live
> code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `1fdba3b`, 2026-07-07

## Why this matters

Three small, independent hardening gaps: (1) CORS reflects any origin, so any website can drive the (currently unauthenticated) API from a visitor's browser, and it becomes a credentialed-CORS hole the moment cookie auth is added; (2) the `tag` list-filter interpolates user input into a SQL LIKE pattern without escaping `%`/`_`, changing match semantics and enabling expensive scans; (3) the bulk-import endpoint accepts unbounded `content` strings and `records` arrays (up to the implicit ~1MB Fastify body limit), all parsed and inserted synchronously on the event loop — an easy DoS lever. All three are S-effort config/validation changes.

## Current state

- `homework-2/backend/src/app.ts:11`:

```ts
fastify.register(cors, { origin: true });
```

No `credentials` option is set (good — keep it that way).

- `homework-2/backend/src/modules/tickets/ticket.repository.ts:40,43-45` (inside `findAll`):

```ts
filters.tag ? like(tickets.tags, `%"${filters.tag}"%`) : undefined,
// ...
if (filters.source) {
  conditions.push(like(tickets.metadata, `%"source":"${filters.source}"%`));
}
```

Drizzle binds the pattern as a parameter, so this is NOT SQL injection. `filters.source` is enum-constrained by the route schema (`ticket.schema.ts:101` — `enum: [...TICKET_SOURCES]`), so only `filters.tag` (`ticket.schema.ts:102` — plain `{ type: 'string' }`) carries user-controlled wildcards.

- `homework-2/backend/src/modules/tickets/ticket.schema.ts:75-88` (`importTicketSchema`):

```ts
properties: {
  format: { type: 'string', enum: ['csv', 'json', 'xml'] },
  content: { type: 'string' },          // ← no maxLength
  records: { type: 'array' },           // ← no maxItems, no item type
  auto_classify: { type: 'boolean' },
},
```

- Frontend origin in dev: `http://localhost:3000` (Next dev default; README documents backend at 3001, frontend at 3000). Frontend API client: `frontend/src/lib/api.ts:3` uses `NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1'`.
- Env-var convention: this repo reads config from `process.env` directly (`server.ts:3-4` — `PORT`, `HOST`). Match it.

## Commands you will need

| Purpose | Command (from `homework-2/`) | Expected on success |
|---|---|---|
| Typecheck | `npm --workspace backend run build` | exit 0 |
| Tests | `npm test` | all pass |

## Scope

**In scope**:
- `homework-2/backend/src/app.ts` (CORS)
- `homework-2/backend/src/modules/tickets/ticket.repository.ts` (LIKE escaping)
- `homework-2/backend/src/modules/tickets/ticket.schema.ts` (import bounds)
- `homework-2/backend/src/shared/constants.ts` (new limit constants)
- `homework-2/backend/tests/` (new cases)
- `plans/README.md` (status row)

**Out of scope**:
- Authentication (plan 013), rate limiting, helmet-style headers — separate decisions.
- Restructuring tags into a join table (bigger change, noted in plan 010's maintenance notes as related follow-up).
- The `source` filter path — enum-constrained, safe as is.

## Git workflow

- Branch: current or `advisor/006-security-hardening`.
- Commit: `fix(homework-2): restrict CORS, escape LIKE wildcards, bound import payloads` (security hardening; write the body normally describing the three changes).
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: CORS allowlist

In `app.ts`, replace `{ origin: true }` with an env-driven allowlist that defaults to the known dev frontend:

```ts
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

fastify.register(cors, { origin: allowedOrigins });
```

Do NOT add `credentials: true`.

**Verify**: `npm test` → all pass (existing tests use `app.inject()`, which bypasses CORS, so nothing should break). Then manual check: `npm run dev:backend` and `curl -s -i -H 'Origin: http://evil.example' http://localhost:3001/api/v1/tickets | grep -i access-control-allow-origin` → header absent; same curl with `Origin: http://localhost:3000` → header echoes `http://localhost:3000`. Stop the dev server after.

### Step 2: Escape LIKE wildcards in the tag filter

In `ticket.repository.ts`, add a private helper and use it for the tag condition, with an explicit ESCAPE clause. Drizzle's `like` doesn't take an ESCAPE clause directly — use `sql` from `drizzle-orm`:

```ts
import { and, asc, eq, like, sql } from 'drizzle-orm';

private escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
// tag condition becomes:
filters.tag ? sql`${tickets.tags} LIKE ${`%"${this.escapeLike(filters.tag)}"%`} ESCAPE '\\'` : undefined,
```

**Verify**: `npm --workspace backend run build` → exit 0; `npm test` → all pass.

### Step 3: Bound the import payload

In `constants.ts` add:

```ts
export const IMPORT_MAX_CONTENT_LENGTH = 1_000_000; // chars, ~matches Fastify's default 1MB body limit
export const IMPORT_MAX_RECORDS = 1_000;
```

In `ticket.schema.ts` (`importTicketSchema`): `content: { type: 'string', maxLength: IMPORT_MAX_CONTENT_LENGTH }`, `records: { type: 'array', maxItems: IMPORT_MAX_RECORDS, items: { type: 'object' } }`.

Additionally enforce the record cap after parsing (CSV/XML `content` can expand to more records than `records` would allow): in `ticket.service.ts` `importTickets`, after `this.importer.parse(payload)`, throw a `ValidationError` if `records.length > IMPORT_MAX_RECORDS` with field `records` and a message naming the limit.

**Verify**: `npm test` → all pass.

### Step 4: Tests for the new bounds

Add to an import test file (pattern: `tests/test_import_json.test.ts`):

1. `records` with `IMPORT_MAX_RECORDS + 1` minimal objects → 400 with validation error.
2. CSV `content` that parses to `IMPORT_MAX_RECORDS + 1` rows (small rows, well under maxLength) → 400 from the service-level cap.
3. Tag filter: create a ticket tagged `100%`, another tagged `100x`; `GET /tickets?tag=100%25` (URL-encoded `100%`) → returns only the `100%` ticket (guards the escaping).

**Verify**: `npm test` → all pass including the 3 new tests.

## Test plan

Covered in Step 4. Model after `tests/test_import_json.test.ts` and the filter tests in `tests/test_ticket_api.test.ts`. Run: `npm test`.

## Done criteria

- [ ] `grep -n 'origin: true' backend/src/app.ts` → no match
- [ ] `grep -n 'ESCAPE' backend/src/modules/tickets/ticket.repository.ts` → 1 match
- [ ] `grep -n 'maxItems' backend/src/modules/tickets/ticket.schema.ts` → ≥1 match
- [ ] `npm --workspace backend run build` exits 0; `npm test` exits 0 with the 3 new tests
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- The installed drizzle-orm version rejects the `sql` template ESCAPE construction (typecheck failure after a reasonable fix attempt) — report; do not fall back to unescaped input.
- Test 3 shows SQLite treating `\\` escaping differently than assumed (both tickets returned) — verify with `sqlite3` semantics (ESCAPE clause is standard); if drizzle double-escapes, adjust the helper, and STOP if two attempts fail.
- The frontend in dev breaks against the CORS allowlist (origin mismatch — e.g. Next dev on a different port) — check the actual origin and extend the default list; STOP only if the frontend origin is dynamic.

## Maintenance notes

- When auth (plan 013) or cookies arrive: `credentials: true` + this allowlist must be reviewed together; never reflect arbitrary origins with credentials.
- `CORS_ORIGINS` env var must be documented in `.env.example` — plan 014 owns that; tell the operator if 014 already ran so it can be amended.
- The JSON-substring tag filtering itself (full scans) remains; a relational `ticket_tags` table is the real fix — deferred, see plan 010 maintenance notes.
