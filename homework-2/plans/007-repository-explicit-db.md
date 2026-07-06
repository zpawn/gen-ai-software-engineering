# Plan 007: `TicketRepository` requires an explicit database — no silent in-memory default

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1fdba3b..HEAD -- homework-2/backend/src/modules/tickets/ticket.repository.ts homework-2/backend/src/config/database.ts homework-2/backend/tests/`
> If any in-scope file changed, compare "Current state" excerpts against live
> code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `1fdba3b`, 2026-07-07

## Why this matters

`new TicketRepository()` with no argument silently creates a fresh in-memory SQLite database (and re-runs migrations on it). Writes to it appear to succeed and then vanish with the process — a latent footgun that only careful explicit wiring currently avoids. Making the constructor argument required turns any future accidental default into a compile error.

## Current state

- `homework-2/backend/src/modules/tickets/ticket.repository.ts:20`:

```ts
constructor(private readonly db: AppDatabase = createDatabase()) {}
```

- `homework-2/backend/src/config/database.ts:12` — `createDatabase(databaseUrl = ':memory:')`, i.e. the default of the default is an in-memory DB.
- The only production wiring, `homework-2/backend/src/modules/tickets/ticket.routes.ts:17-19`:

```ts
const db = process.env.NODE_ENV === 'test' ? createDatabase() : createApplicationDatabase();
const repository = new TicketRepository(db);
```

— already passes `db` explicitly. Tests construct repositories via `buildApp()` (which goes through routes) or may construct them directly; find all sites with `grep -rn 'new TicketRepository' backend/src backend/tests`.

## Commands you will need

| Purpose | Command (from `homework-2/`) | Expected on success |
|---|---|---|
| Typecheck | `npm --workspace backend run build` | exit 0 |
| Tests | `npm test` | all pass |

## Scope

**In scope**:
- `homework-2/backend/src/modules/tickets/ticket.repository.ts` (line 20)
- Any caller `npm`/`grep` surfaces in `backend/src/` or `backend/tests/` that relied on the default (pass `createDatabase()` explicitly there)
- `plans/README.md` (status row)

**Out of scope**:
- `database.ts` — `createDatabase`'s own `':memory:'` default is fine (it's explicit at its call sites and used by tests).
- Removing the unused-import cleanups beyond what the change forces.

## Git workflow

- Branch: current or `advisor/007-explicit-db`.
- Commit: `refactor(homework-2): require explicit db in TicketRepository`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Make the parameter required

```ts
constructor(private readonly db: AppDatabase) {}
```

If `createDatabase` becomes an unused import in the file, remove it.

**Verify**: `npm --workspace backend run build` → either exit 0 (no callers used the default) or type errors listing every caller to fix in Step 2.

### Step 2: Fix any defaulting callers

For each type error site, pass an explicit database: in tests, `new TicketRepository(createDatabase())` (fresh in-memory — the previous behavior, now visible); in src, this should not occur outside `ticket.routes.ts` which already passes `db` — if it does, report it in your summary.

**Verify**: `npm --workspace backend run build` → exit 0; `npm test` → all pass.

## Test plan

No new tests — the compiler is the test. Full suite must stay green: `npm test`.

## Done criteria

- [ ] `grep -n 'db: AppDatabase = ' backend/src/modules/tickets/ticket.repository.ts` → no match
- [ ] `npm --workspace backend run build` exits 0
- [ ] `npm test` exits 0
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- The constructor no longer matches the excerpt (drift).
- More than ~5 call sites in `backend/src/` (not tests) relied on the default — that implies an architecture this plan didn't anticipate; report instead of mass-editing.

## Maintenance notes

- Reviewer: confirm test call sites got `createDatabase()` (fresh in-memory) and not `createApplicationDatabase()` (would write to `data/support.db` during tests).
- Related but deferred: `ticket.routes.ts` creating the DB inside route registration makes multi-module reuse awkward; if a second module ever appears, hoist DB creation to `app.ts` and inject it.
