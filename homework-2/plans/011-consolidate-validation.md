# Plan 011: One validation authority for ticket input — HTTP and import paths share it

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1fdba3b..HEAD -- homework-2/backend/src/modules/tickets/ticket.schema.ts homework-2/backend/src/modules/tickets/ticket.service.ts`
> If any in-scope file changed, compare "Current state" excerpts against live
> code before proceeding; on a mismatch, treat it as a STOP condition.
> Expected benign drift: plan 005 hoists an EMAIL_REGEX constant in the
> service; plan 006 adds import bounds to the schema. Both coexist with this
> plan.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (best after 003/005 to avoid merge friction)
- **Category**: tech-debt
- **Planned at**: commit `1fdba3b`, 2026-07-07

## Why this matters

The same validation rules exist twice: once as Fastify JSON schema (`ticket.schema.ts` — email pattern, subject/description length, enums, driven by shared constants) and once as hand-rolled checks in `TicketService.validateTicketInput` (`ticket.service.ts:190-249`). They share constants but not logic, so they can drift (one layer updated, the other not). The duplication is load-bearing in one direction: the bulk-import path bypasses Fastify body validation for individual records, so the service checks are the only guard there. The goal is not to delete either layer blindly but to make the service validator the single authority for record-level rules and slim the JSON schema's role to transport-shape enforcement, documenting the split.

## Current state

- `homework-2/backend/src/modules/tickets/ticket.schema.ts:24-40` — `ticketBodyProperties`: `customer_email` pattern (`EMAIL_PATTERN`), `subject` min/max (`SUBJECT_MIN_LENGTH/MAX`), `description` min/max, enums for category/priority/status, metadata sub-schema with `source`/`device_type` enums, `additionalProperties: false` on bodies.
- `homework-2/backend/src/modules/tickets/ticket.service.ts:190-249` — `validateTicketInput(input, partial)`: `requireString` × 5, email regex test, `validateLength` for subject/description, `validateEnum` × 5 (category, priority, status, metadata.source, metadata.device_type), tags-is-array check. Throws `ValidationError(details)`.
- Import path: `importTickets` → `importer.parse()` → `createTicket(record)` → `validateTicketInput` — records never pass through Fastify schema. The import body schema (`importTicketSchema`, lines 75-88) validates only the envelope (`format`, `content`, `records: array`).
- Both layers pull from `homework-2/backend/src/shared/constants.ts` (`EMAIL_PATTERN`, `SUBJECT_*`, `DESCRIPTION_*`, `TICKET_*`, `DEVICE_TYPES`) — that's why they haven't drifted *yet*.
- Error shape: schema violations → 400 `{ error: 'Validation failed', details: [{field, message}] }` via `error-handler.ts:5-12`; service `ValidationError` → 400 with the same shape via the `AppError` branch. Clients can't tell the layers apart today — preserve that.

## Commands you will need

| Purpose | Command (from `homework-2/`) | Expected on success |
|---|---|---|
| Typecheck | `npm --workspace backend run build` | exit 0 |
| Tests | `npm test` | all pass |
| Coverage | `npm run test:coverage` | thresholds met |

## Scope

**In scope**:
- `homework-2/backend/src/modules/tickets/ticket.schema.ts`
- `homework-2/backend/src/modules/tickets/ticket.service.ts` (validation region only)
- `homework-2/backend/tests/` (validation cases)
- `plans/README.md` (status row)

**Out of scope**:
- Introducing a validation library (zod/typebox) — a real option, but a migration decision for the maintainer, not this plan. Keep the hand-rolled validator.
- Route/controller/repository files.
- Weakening any currently-enforced rule (see done criteria — the matrix must not lose a row).

## Git workflow

- Branch: current or `advisor/011-validation`.
- Commit: `refactor(homework-2): single validation authority for ticket input`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Map the coverage matrix (no code change)

Build a table: rule × (JSON schema? service?) for every rule in both layers, from the excerpts above plus a fresh read of both files. Purpose: prove no rule exists ONLY in the JSON schema before slimming it. Known service-only rules: none expected. Known schema-only rules: `additionalProperties: false` (unknown-field rejection), `required` on create, `minProperties: 1` on update — these are transport-shape rules and STAY in the schema.

**Verify**: matrix written into your report; every schema rule is classified "shape (stays)" or "record-level (duplicated in service)".

### Step 2: Slim the JSON schema to shape enforcement

In `ticketBodyProperties`, drop the record-level constraints that the service re-checks: the email `pattern`, subject/description `minLength/maxLength`, and the enum lists on `category/priority/status` and metadata `source/device_type` (keep `type: 'string'`). KEEP: types, `required`, `additionalProperties: false`, `minProperties: 1`, tags `items: {type: 'string'}`.

Add a comment block at the top of `ticketBodyProperties` stating the contract: "Transport shape only. Record-level rules (formats, lengths, enums) live in TicketService.validateTicketInput — the single authority, shared with the import path."

Note: the LIST querystring enums (`listTicketsSchema`) are NOT body validation — leave them untouched (they guard the repository's source filter; see plan 006).

**Verify**: `npm --workspace backend run build` → exit 0; `npm test` → validation-related tests still pass (they assert 400s, which now come from the service instead of the schema — same status and shape; if any test asserts a Fastify-specific message string, update the assertion and note it).

### Step 3: Close service gaps the schema was covering

From the Step 1 matrix, add to `validateTicketInput` anything that was schema-only and record-level. Expected gap: none or minimal (e.g. tags item type — service only checks `Array.isArray`; add a per-item `typeof === 'string'` check with field `tags`).

**Verify**: `npm test` → all pass.

### Step 4: Regression tests proving both paths enforce the same rules

Add paired cases (pattern: `tests/test_ticket_api.test.ts` + `tests/test_import_json.test.ts`):

1. POST /tickets with bad email → 400, details name `customer_email`.
2. Import a record with the same bad email → summary `errors[0]` names `customer_email`.
3. POST with out-of-enum `category` → 400. 4. Import record with same → error entry.
5. POST with 3-char description (< DESCRIPTION_MIN_LENGTH=10) → 400. 6. Import same → error entry.

**Verify**: `npm run test:coverage` → all pass, thresholds met.

## Test plan

Step 4; run `npm run test:coverage`.

## Done criteria

- [ ] Coverage matrix in the executor report; no record-level rule lost (each row enforced somewhere)
- [ ] The three paired tests pass on both paths
- [ ] `grep -n 'pattern: EMAIL_PATTERN' backend/src/modules/tickets/ticket.schema.ts` → no match
- [ ] `npm --workspace backend run build` and `npm run test:coverage` exit 0
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- Step 1 reveals a schema rule that is record-level AND absent from the service AND non-trivial to port (more than ~10 lines) — report before proceeding.
- Existing tests assert Fastify-schema-specific error details (e.g. `instancePath`) in more than 5 places — the blast radius is bigger than planned; report.
- Anything requires changing the 400 response shape — that's a breaking API change, out of scope; STOP.

## Maintenance notes

- Future rule changes now happen in exactly one place (`validateTicketInput` + `constants.ts`). Reviewer: reject any PR that re-adds enums/patterns to `ticketBodyProperties`.
- The maintainer may later prefer zod/typebox with Fastify type-provider integration — this plan keeps that door open (the validator is already one function).
- Related deferred item: tags as a relational table (see plans 006/010 notes) would move tag validation into the model layer.
