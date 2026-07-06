# Plan 017 (spike): Design bulk re-classification — re-run the classifier over the existing corpus

> **Executor instructions**: This is a DESIGN SPIKE, not a build plan. The
> deliverable is a written design document plus a small throwaway prototype —
> NOT production code merged into `src/`. Follow the steps, honor STOP
> conditions, and update this plan's row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 1fdba3b..HEAD -- homework-2/backend/src/modules/tickets/`
> Drift from DONE plans is expected (005 restructures the classify path,
> 008 changes matching); design against the CURRENT code, and note in the
> OUTCOME doc which dependent plans were DONE at design time.

## Status

- **Priority**: P3 (direction — maintainer's call; least urgent of the three spikes)
- **Effort**: M (coarse — spike itself is S)
- **Risk**: MED (bulk writes; can overwrite manual work if force semantics are sloppy)
- **Depends on**: plans/005-import-transaction-and-write-path.md (`runInTransaction`, `classifyAndPersist` seam), plans/008-classifier-word-boundaries.md (reclassifying with the OLD matcher would bake in its false positives)
- **Category**: direction
- **Planned at**: commit `1fdba3b`, 2026-07-07

## Why this matters

Classifier rules are hardcoded keyword tables (`ticket.classifier.ts:9-53`) — they will change (plan 008 changes matching semantics already). When they do, only newly created/imported tickets benefit; the existing corpus keeps stale categories, and there is no way to re-run classification in bulk: auto-classify exists only per-ticket (`POST /tickets/:id/auto-classify`) and inline during import. The single-ticket path already models the key semantic (`classification_overridden` guard + `force` flag, `ticket.service.ts:160-167`); a bulk variant is the missing corner.

## Current state (evidence)

- Single-ticket path: `ticket.service.ts:158-183` — override guard throws unless `force`; classify → append decision log → update ticket.
- Import-time bulk: `importTickets` loops `createTicket(..., { autoClassify })` — new tickets only.
- Override semantics: `classification_overridden` set true on manual category/priority create/update (`ticket.service.ts:48,123-128`), reset false by auto-classify.
- Decision log: append-only per classification (`ticket.repository.ts:64-77`) — a bulk run over N tickets appends N log rows (audit trail comes free; volume implications to assess).
- After plan 005: `runInTransaction` helper and a `classifyAndPersist(ticket, options)` core exist — the natural building blocks.

## Scope

**In scope (deliverables)**:
- `plans/017-spike-bulk-reclassify.OUTCOME.md` (create)
- Throwaway prototype only under `backend/tests/` (deleted/`.skip`ed at the end)
- `plans/README.md` (status row)

**Out of scope**:
- Any change under `backend/src/` or `frontend/src/`.

## Steps

### Step 1: Design doc

Write `plans/017-spike-bulk-reclassify.OUTCOME.md` with recommendations for:

1. **Route & contract**: `POST /tickets/reclassify` accepting `TicketFilters` (scope which tickets) + options. Response mirrors `ImportSummary` (total/changed/skipped/errors) — propose the exact shape, including per-ticket before→after categories for changed tickets (or a count-only mode above N).
2. **Override protection — the core decision**: default MUST skip `classification_overridden` tickets; `force: true` overrides. Design question: should force also be filterable (e.g. `force` only with an explicit `include_overridden: true`)? Recommend the least-surprising combination and enumerate the 4 (overridden × force) cases in a table.
3. **Idempotency & no-op detection**: skip the write (and the decision-log append?) when the new decision equals the current category+priority — or always log for audit? Recommend, with the log-volume tradeoff stated.
4. **Batching & responsiveness**: whole run in one transaction (plan 005's helper) vs chunks; the service is synchronous — estimate event-loop blocking for 10k tickets from the prototype's measured per-ticket cost, and set the cap or chunking strategy accordingly (relate to plan 006's `IMPORT_MAX_RECORDS` philosophy).
5. **Dry-run mode**: `dry_run: true` returning what WOULD change without writing — cheap to design in now, high operator value; recommend in or out.

### Step 2: Prototype the loop

Throwaway test: seed ~100 tickets (mixed overridden/not), run a prototype reclassify loop using the current service/classifier pieces inside a transaction, measure wall-clock per ticket, and assert: overridden tickets untouched without force; changed count correct; decision-log rows appended only per the chosen no-op policy. Record timings and any friction in the OUTCOME doc.

**Verify**: prototype runs green; timings + findings recorded; prototype removed or `.skip`ed.

### Step 3: Estimate + open questions

Effort estimate (expect M), maintainer decisions (force semantics table sign-off, cap value, dry-run in v1), and the note that this endpoint plus plan 008 together form the "safe rule-tuning workflow": change rules → dry-run → review → force-run.

## Done criteria

- [ ] OUTCOME doc covers all 5 design areas, including the 4-case override×force table
- [ ] Prototype measured per-ticket cost; numbers are in the doc
- [ ] No changes under `backend/src/` or `frontend/src/` (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- Plans 005 and 008 are both not DONE — the design would target code two refactors away; note it in the index and defer this spike rather than designing against moving ground.

## Maintenance notes

- The decision-log volume question (3) compounds with plan 016's stats over that table — if both land, agree on one policy.
- A future async/job-queue version is deliberately out of scope; the synchronous capped version is the honest v1 for this codebase.
