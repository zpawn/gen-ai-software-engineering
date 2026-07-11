# Plan 016 (spike): Design `GET /tickets/stats` — aggregate the classification data that already exists

> **Executor instructions**: This is a DESIGN SPIKE, not a build plan. The
> deliverable is a written design document plus a small throwaway prototype —
> NOT production code merged into `src/`. Follow the steps, honor STOP
> conditions, and update this plan's row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 1fdba3b..HEAD -- homework-2/backend/src/modules/tickets/ homework-2/frontend/src/components/ticket-dashboard.tsx`
> Drift from DONE plans is expected; re-read cited sections before designing.

## Status

- **Priority**: P3 (direction — maintainer's call)
- **Effort**: M (coarse — spike itself is S)
- **Risk**: LOW (additive read endpoint)
- **Depends on**: plans/010-list-pagination.md (the dashboard's metric cards lose full-set data when pagination lands — this endpoint is the replacement), plans/003-fix-resolved-at-on-update.md (resolution-time stats need correct `resolved_at`)
- **Category**: direction
- **Planned at**: commit `1fdba3b`, 2026-07-07

## Why this matters

Every classification persists confidence, reasoning, and keywords (`ticket.service.ts:169-182`), and a per-ticket decision log exists (`GET /tickets/:id/classification-log`). The assignment (`TASKS.md`) explicitly required storing confidence and logging decisions — done, but the data is unqueryable in aggregate. The dashboard cannot show volume by category/priority, confidence distributions, or a "low-confidence, needs human review" queue without fetching every ticket. After plan 010 paginates the list, the dashboard's client-computed metric cards silently degrade to page-scoped numbers — a server-side stats endpoint is the correct replacement.

## Current state (evidence)

- Data available per ticket (`ticket.model.ts` / DB columns): category, priority, status, created_at, resolved_at, classification_confidence (nullable), classification_overridden.
- Decision log table: `classificationDecisions` (`ticket.repository.ts:64-77`) — ticket_id, category, priority, confidence, reasoning, keywords_found, decided_at.
- Confidence formula floor: `0.45 + matches*0.15/0.1`, cap 0.95 (`ticket.classifier.ts:97-100`) — "low confidence" ≈ 0.45–0.60 band (no matches or single weak match).
- Dashboard metrics today: `buildMetrics(tickets)` client-side over the full fetched list (`ticket-dashboard.tsx:111`).
- Indexes exist on category/priority/status (`ticket.model.ts:104-109` per audit) — group-by queries are cheap.

## Scope

**In scope (deliverables)**:
- `plans/016-spike-ticket-stats.OUTCOME.md` (create)
- Throwaway prototype only under `backend/tests/` (deleted/`.skip`ed at the end)
- `plans/README.md` (status row)

**Out of scope**:
- Any change under `backend/src/` or `frontend/src/`.

## Steps

### Step 1: Design doc

Write `plans/016-spike-ticket-stats.OUTCOME.md` answering with recommendations:

1. **Response shape**: propose the JSON for `GET /tickets/stats` — counts by category, by priority, by status; total; low-confidence bucket (count + the threshold used); overridden count; optionally avg/median resolution time (depends on plan 003 being DONE — check the index; if not done, exclude and say why). Every cut must map to a concrete dashboard widget (name it).
2. **Low-confidence threshold**: recommend a value grounded in the formula above (e.g. `< 0.6` = zero-or-one keyword match) and whether it's a query param (`?low_confidence_below=0.6`) or a constant.
3. **Filters**: does stats accept the same `TicketFilters`? (Recommendation: yes — "stats for status=new" is the review-queue view; assess the repository-query implications.)
4. **One query or N**: sketch the drizzle/SQLite query strategy — single pass with conditional aggregation vs one group-by per dimension; measure in the prototype.
5. **Dashboard integration**: which of the current `buildMetrics` cards move to server data, and what the review-queue UI needs (`GET /tickets?classification_confidence_below=...` — does THAT need a new list filter too? If yes, record it as a scope item for the build plan).

### Step 2: Prototype the query

Throwaway test: seed ~50 tickets via the service with varied categories/confidences (import or loop), then run the proposed aggregation as raw drizzle queries against the repository's `db`, asserting the counts match hand-computed expectations. Record query count and any SQLite/drizzle friction in the OUTCOME doc.

**Verify**: prototype runs green; findings recorded; prototype removed or `.skip`ed.

### Step 3: Estimate + open questions

Effort estimate for the build plan (expect S-M for backend, S for dashboard cards), maintainer decisions (threshold value, which widgets ship first, whether the review queue is a filter on the list endpoint or a stats-only count).

## Done criteria

- [ ] OUTCOME doc answers all 5 questions with a concrete proposed response JSON
- [ ] Prototype validated the aggregation strategy; results recorded
- [ ] No changes under `backend/src/` or `frontend/src/` (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- Aggregation needs data not currently stored (e.g. per-decision timestamps beyond `decided_at`) — record the schema gap as a build-plan prerequisite instead of designing around it.

## Maintenance notes

- This spike + plan 010 together define the dashboard's data story: list = paginated page, stats = full-set aggregates. Keep that split in the build plan.
- If the export spike (015) also lands, "export the low-confidence queue" composes both — note it as a future option, don't design it now.
