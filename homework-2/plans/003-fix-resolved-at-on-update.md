# Plan 003: `resolved_at` is stamped when a ticket becomes resolved/closed via update, and cleared on reopen

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1fdba3b..HEAD -- homework-2/backend/src/modules/tickets/ticket.service.ts homework-2/backend/tests/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (001 recommended first for CI)
- **Category**: bug
- **Planned at**: commit `1fdba3b`, 2026-07-07

## Why this matters

Transitioning a ticket to `resolved` or `closed` through `PUT /tickets/:id` never stamps `resolved_at`, and reopening a resolved ticket never clears it. The auto-stamp only works on create. Any resolution-time/SLA reporting built on `resolved_at` is silently wrong for every ticket resolved through the normal update flow — which is how the frontend's status dropdown resolves tickets.

## Current state

All in `homework-2/backend/src/modules/tickets/ticket.service.ts`.

The update path (line 141):

```ts
resolved_at: this.resolveTimestamp(status, input.resolved_at ?? existing.resolved_at),
```

The helper (lines 268–271):

```ts
private resolveTimestamp(status: TicketStatus, provided?: string | null): string | null {
  if (provided !== undefined) return provided;
  return status === 'resolved' || status === 'closed' ? new Date().toISOString() : null;
}
```

The bug: when the caller does not send `resolved_at`, `input.resolved_at` is `undefined`, so `input.resolved_at ?? existing.resolved_at` falls back to `existing.resolved_at` — which is `null` for an unresolved ticket. `null !== undefined`, so `resolveTimestamp` returns `null` verbatim and the status-derived stamp on the next line is unreachable. Symmetrically, a previously resolved ticket reopened to `new` keeps its stale non-null `resolved_at`.

The create path (line 62) is correct because it passes `input.resolved_at` directly:

```ts
resolved_at: this.resolveTimestamp(input.status ?? 'new', input.resolved_at),
```

Ticket statuses (`homework-2/backend/src/shared/constants.ts`): `'new' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'`.

Repo conventions: service methods throw `ValidationError`/`NotFoundError` from `src/shared/errors.ts`; tests live in `homework-2/backend/tests/*.test.ts` and build the app via `buildApp()` — see `tests/test_ticket_api.test.ts` and the fixture factory `tests/helpers.ts` (`ticketInput(overrides)`).

## Commands you will need

| Purpose | Command (from `homework-2/`) | Expected on success |
|---|---|---|
| Typecheck | `npm --workspace backend run build` | exit 0 |
| Tests | `npm test` | all pass |

## Scope

**In scope**:
- `homework-2/backend/src/modules/tickets/ticket.service.ts` (lines ~141 and ~268-271 only)
- `homework-2/backend/tests/test_ticket_api.test.ts` or a new `tests/test_resolved_at.test.ts`
- `plans/README.md` (status row)

**Out of scope**:
- `ticket.schema.ts` — the API contract (callers may still explicitly set `resolved_at`) must not change.
- `ticket.repository.ts`, controller, routes.
- The create path (line 62) — it is correct; leave it.

## Git workflow

- Branch: current (`homework-2-submission`) or `advisor/003-resolved-at`.
- Commit: `fix(homework-2): stamp resolved_at on status transitions via update`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Distinguish "caller provided" from "fallback"

In `updateTicket`, pass the raw input through so only an explicit caller value short-circuits:

```ts
resolved_at: this.resolveTimestamp(status, input.resolved_at, existing.resolved_at),
```

Change the helper to derive from status when the caller sent nothing, preserving an existing stamp while the ticket stays resolved/closed:

```ts
private resolveTimestamp(status: TicketStatus, provided?: string | null, existing: string | null = null): string | null {
  if (provided !== undefined) return provided;
  if (status === 'resolved' || status === 'closed') return existing ?? new Date().toISOString();
  return null;
}
```

Semantics this encodes (all must hold):
- Update to `resolved`/`closed`, no `resolved_at` in body, existing null → stamped with now.
- Update to `resolved`/`closed`, existing already stamped → keep the existing stamp (don't re-stamp on every touch of a resolved ticket).
- Update to a non-terminal status (`new`/`in_progress`/`waiting_customer`) with no `resolved_at` in body → cleared to null.
- Caller explicitly sends `resolved_at` (string or null) → honored verbatim (existing behavior).
- Create path still works: it calls with two args; `existing` defaults to `null`.

**Verify**: `npm --workspace backend run build` → exit 0.

### Step 2: Regression tests

Add tests (pattern: existing `PUT` tests in `tests/test_ticket_api.test.ts`, using `buildApp()` + `ticketInput()` from `tests/helpers.ts`) covering exactly the five semantics above via the HTTP API:

1. POST a ticket (status defaults `new`, `resolved_at` null) → PUT `{ status: 'resolved' }` → response `resolved_at` is a non-null ISO string.
2. PUT `{ status: 'closed' }` on the same ticket → `resolved_at` unchanged from test 1's value (fetch before/after and compare).
3. PUT `{ status: 'in_progress' }` on a resolved ticket → `resolved_at` is null.
4. PUT `{ status: 'resolved', resolved_at: '2026-01-01T00:00:00.000Z' }` → `resolved_at` equals exactly that string.
5. POST with `status: 'resolved'` and no `resolved_at` → stamped on create (guards the untouched create path).

**Verify**: `npm test` → all pass, including the 5 new tests.

## Test plan

Covered in Step 2. Model after `tests/test_ticket_api.test.ts`. Run: `npm test`.

## Done criteria

- [ ] `npm --workspace backend run build` exits 0
- [ ] `npm test` exits 0 with 5 new resolved_at tests passing
- [ ] Test 1's scenario fails on the pre-change code (verify by mentally tracing or `git stash` the fix and re-running the new test — it must fail, proving it guards the bug)
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- Line 141 or the `resolveTimestamp` helper no longer matches the excerpts (drift).
- An existing test asserts the current (buggy) behavior — that means someone codified it as intended; report before changing the test.
- Keeping vs. re-stamping semantics (bullet 2 in Step 1) conflicts with something in `backend/docs/API_REFERENCE.md` — report the conflict.

## Maintenance notes

- If SLA/resolution-time reporting (see plans/016 stats spike) lands later, it depends on this fix — resolved tickets before this fix may have null `resolved_at`; a backfill is out of scope here and deferred deliberately.
- Reviewer: check the "keep existing stamp" branch — the alternative (re-stamp on every update while resolved) was rejected because it silently rewrites history on unrelated field edits.
