# Plan 005: Bulk import runs in one transaction; create/update stop issuing redundant queries

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1fdba3b..HEAD -- homework-2/backend/src/modules/tickets/ homework-2/backend/src/config/database.ts homework-2/backend/tests/`
> If any in-scope file changed, compare "Current state" excerpts against live
> code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `1fdba3b`, 2026-07-07

## Why this matters

A bulk import of N records currently performs N independent auto-committed SQLite write transactions (each with its own disk sync), and each ticket creation is itself multiplied: `create` does insert + re-select, and the auto-classify path (the default for imports) re-fetches the ticket, inserts a decision, updates, and re-selects again — roughly 6 statements per imported ticket. Import latency grows linearly with fsyncs and a mid-import crash leaves a partial result. This plan wraps the import loop in a single transaction and removes the redundant reads.

## Current state

- `homework-2/backend/src/modules/tickets/ticket.repository.ts`:

```ts
// lines 22-25
create(ticket: Ticket): Ticket {
  this.db.insert(tickets).values(this.toRow(ticket)).run();
  return this.findById(ticket.id)!;          // ← redundant re-select
}
// lines 54-57
update(id: string, changes: Ticket): Ticket {
  this.db.update(tickets).set(this.toRow(changes)).where(eq(tickets.id, id)).run();
  return this.findById(id)!;                 // ← redundant re-select
}
```

- `homework-2/backend/src/modules/tickets/ticket.service.ts`:

```ts
// lines 72-77 — createTicket tail
const created = this.repository.create(ticket);
if (options.autoClassify && !created.classification_overridden) {
  return this.autoClassifyTicket(created.id, { force: true }).ticket;   // ← re-fetches by id
}
// lines 85-95 — importTickets loop
records.forEach((record, index) => {
  try {
    tickets.push(this.createTicket(record, { autoClassify: payload.auto_classify }));
  } catch (error) { /* pushes into errors[] with record index */ }
});
// lines 158-183 — autoClassifyTicket(id, options): getTicketById(id) → classify → appendClassificationDecision → repository.update
```

- `homework-2/backend/src/config/database.ts` — `AppDatabase = BetterSQLite3Database` (drizzle over better-sqlite3, synchronous). Drizzle's better-sqlite3 driver supports synchronous `db.transaction((tx) => { ... })`.
- Existing import semantics (must be preserved): one bad record is skipped and reported in `errors[]`; good records still import. The response is `ImportSummary { total_records, successful, failed, errors, tickets }` — see `ticket.service.ts:30-36`. Tests pin this: `tests/test_import_csv.test.ts`, `test_import_json.test.ts`, `test_import_xml.test.ts`.
- Also fold in a micro-fix: `ticket.service.ts:199` compiles `new RegExp(EMAIL_PATTERN)` on every validation call — hoist to a module-level constant.

## Commands you will need

| Purpose | Command (from `homework-2/`) | Expected on success |
|---|---|---|
| Typecheck | `npm --workspace backend run build` | exit 0 |
| Tests | `npm test` | all pass |
| Coverage | `npm run test:coverage` | thresholds met |

## Scope

**In scope**:
- `homework-2/backend/src/modules/tickets/ticket.repository.ts`
- `homework-2/backend/src/modules/tickets/ticket.service.ts`
- `homework-2/backend/tests/` (extend import tests)
- `plans/README.md` (status row)

**Out of scope**:
- The `ImportSummary` response shape and skip-bad-records semantics — the frontend and tests depend on them.
- `ticket.schema.ts`, routes, controller, importer parsing logic.
- Switching SQLite to WAL mode (separate decision, not needed for the win).

## Git workflow

- Branch: current or `advisor/005-import-transaction`.
- Commit: `perf(homework-2): single-transaction import, drop redundant re-selects`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Repository returns what it already holds

In `ticket.repository.ts`, `create` returns the ticket it inserted; `update` returns the changes it wrote (both objects are fully materialized by the service before the call):

```ts
create(ticket: Ticket): Ticket {
  this.db.insert(tickets).values(this.toRow(ticket)).run();
  return ticket;
}
update(id: string, changes: Ticket): Ticket {
  this.db.update(tickets).set(this.toRow(changes)).where(eq(tickets.id, id)).run();
  return changes;
}
```

Note: `update` previously returned the row re-read from the DB; callers always pass a complete `Ticket` (see `updateTicket` building `updated: Ticket` at service lines 130-147), so behavior is identical. If `update`'s `changes` were ever partial this would be wrong — they are not (type is `Ticket`, not `Partial<Ticket>`).

**Verify**: `npm --workspace backend run build` → exit 0; `npm test` → all pass.

### Step 2: Avoid the re-fetch in the auto-classify path

In `ticket.service.ts`, add a private classification core that takes an in-hand ticket, and keep the public method as a thin wrapper:

```ts
autoClassifyTicket(id, options) → const ticket = this.getTicketById(id); return this.classifyAndPersist(ticket, options);
private classifyAndPersist(ticket: Ticket, options): { ticket; classification } // body = current lines 160-182, minus the getTicketById
```

In `createTicket`, call `this.classifyAndPersist(created, { force: true })` instead of `this.autoClassifyTicket(created.id, { force: true })`.

**Verify**: `npm test` → all pass (classification tests in `tests/test_categorization.test.ts` pin the behavior).

### Step 3: Wrap the import loop in one transaction

Expose a transaction helper on the repository:

```ts
runInTransaction<T>(fn: () => T): T {
  return this.db.transaction(fn);
}
```

In `importTickets`, wrap the whole `records.forEach(...)` loop:

```ts
this.repository.runInTransaction(() => {
  records.forEach((record, index) => { /* existing body unchanged */ });
});
```

The per-record try/catch stays inside the loop, so a bad record still lands in `errors[]` without aborting the transaction — semantics preserved, but all successful inserts commit together with one fsync.

**Verify**: `npm test` → all import tests pass, including partial-failure cases (mixed valid/invalid records import the valid ones and report the invalid).

### Step 4: Hoist the email regex

In `ticket.service.ts`, add at module scope `const EMAIL_REGEX = new RegExp(EMAIL_PATTERN);` and use it at line ~199 instead of `new RegExp(EMAIL_PATTERN)`.

**Verify**: `npm --workspace backend run build` → exit 0; `npm test` → all pass.

## Test plan

- Extend one import test (e.g. `tests/test_import_json.test.ts`) with a mixed batch: 3 valid + 1 invalid record → expect `successful: 3, failed: 1`, 3 tickets present via `GET /tickets` (guards that the transaction wrapper didn't change skip semantics).
- Existing suites are the main net: `test_import_csv/json/xml`, `test_categorization`, `test_ticket_api`.
- Run: `npm run test:coverage` → all pass, thresholds met.

## Done criteria

- [ ] `npm --workspace backend run build` exits 0
- [ ] `npm run test:coverage` exits 0, thresholds met
- [ ] `grep -n 'findById(ticket.id)!' backend/src/modules/tickets/ticket.repository.ts` → no match
- [ ] `grep -n 'db.transaction' backend/src/modules/tickets/ticket.repository.ts` → 1 match
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- Drizzle's `db.transaction` on the better-sqlite3 driver is not synchronous in the installed version (typecheck forces a Promise) — STOP; do not switch to async without approval, it changes the service's synchronous contract.
- Any existing test asserts that a failed import record rolls back previously imported records (all-or-nothing) — contradicts the observed skip semantics; report.
- `update` callers turn out to pass partial objects anywhere (typecheck error in Step 1) — report; the re-select removal for `update` would be unsafe.

## Maintenance notes

- If plan 017 (bulk reclassify) lands, it should reuse `runInTransaction`.
- Reviewer: check Step 1's `update` return — it now returns the object passed in, so any future caller that builds a partial `Ticket` via `as` casts would silently return stale fields.
- WAL mode + prepared-statement reuse are further wins, deliberately deferred (not needed at current scale).
