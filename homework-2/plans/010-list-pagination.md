# Plan 010: `GET /tickets` is paginated; the dashboard consumes pages

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1fdba3b..HEAD -- homework-2/backend/src/modules/tickets/ homework-2/frontend/src/lib/api.ts homework-2/frontend/src/components/ticket-dashboard.tsx`
> If any in-scope file changed, compare "Current state" excerpts against live
> code before proceeding; on a mismatch, treat it as a STOP condition.
> NOTE: plans 003–009 legitimately touch some of these files — drift from a
> DONE plan in `plans/README.md` is expected; re-read the touched sections
> and proceed if the pagination-relevant excerpts still hold.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (API contract change)
- **Depends on**: plans/009-frontend-test-suite.md (safety net for the frontend edits)
- **Category**: perf
- **Planned at**: commit `1fdba3b`, 2026-07-07

## Why this matters

`GET /tickets` returns every ticket as one JSON array — the repository calls `.all()` with no limit, and the dashboard fetches the entire table on mount and after every mutation, then searches/filters in memory. Response size and render cost grow linearly with the table; a realistic support inbox produces multi-MB payloads. This plan adds `limit`/`offset` pagination with a total count, keeping backward compatibility where cheap.

## Current state

- `homework-2/backend/src/modules/tickets/ticket.repository.ts:32-52` — `findAll(filters)` builds eq/like conditions, then `.orderBy(asc(tickets.created_at)).all()` — no limit/offset.
- `homework-2/backend/src/modules/tickets/ticket.schema.ts:90-105` — `listTicketsSchema.querystring` allows: `category, priority, status, customer_id, customer_email, assigned_to, source, tag`. No pagination params. `additionalProperties: false` — unknown params are rejected, so adding `limit`/`offset` is required before clients may send them.
- `homework-2/backend/src/modules/tickets/ticket.service.ts:106-108` — `listTickets(filters)` passes through.
- Controller: `homework-2/backend/src/modules/tickets/ticket.controller.ts` — find the `listTickets` handler (reads `request.query`, replies with the array).
- `TicketFilters` type: `homework-2/backend/src/modules/tickets/ticket.model.ts`.
- Frontend consumption:
  - `frontend/src/lib/api.ts:33-41` — `listTickets(filters)` builds `URLSearchParams`, returns `Promise<Ticket[]>`.
  - `frontend/src/components/ticket-dashboard.tsx:113-128` — `loadTickets` sets the whole array into state; `visibleTickets` (line 90) does client-side search over all tickets; `metrics = buildMetrics(tickets)` (line 111) computes stat cards from the full set.
- **Contract decision (made by the advisor, honor it)**: the response shape of `GET /tickets` changes from `Ticket[]` to `{ tickets: Ticket[], total: number, limit: number, offset: number }`. `limit` defaults to 50, max 200; `offset` defaults 0. This is a breaking change to the endpoint — the frontend, tests, and `backend/docs/API_REFERENCE.md` are all updated in this plan. Client-side search stays but is scoped to the loaded page; metrics get the server `total` for the "total" card and page-scoped values elsewhere (acceptable for now — note it in the UI copy only if a label becomes misleading).

## Commands you will need

| Purpose | Command (from `homework-2/`) | Expected on success |
|---|---|---|
| Backend typecheck | `npm --workspace backend run build` | exit 0 |
| Backend tests | `npm --workspace backend test` | all pass |
| Frontend tests | `npm --workspace frontend test` | all pass |
| Frontend build | `npm --workspace frontend run build` | exit 0 |

## Scope

**In scope**:
- `backend/src/modules/tickets/`: `ticket.schema.ts`, `ticket.model.ts` (TicketFilters), `ticket.repository.ts`, `ticket.service.ts`, `ticket.controller.ts`
- `backend/tests/` (list-endpoint tests)
- `backend/docs/API_REFERENCE.md` (GET /tickets section)
- `frontend/src/lib/api.ts`, `frontend/src/types/ticket.ts`, `frontend/src/components/ticket-dashboard.tsx` + their tests
- `plans/README.md` (status row)

**Out of scope**:
- Cursor-based pagination (limit/offset is enough at this scale).
- Server-side full-text search (the search box stays client-side over the page).
- `GET /tickets/:id`, import, classify endpoints.

## Git workflow

- Branch: current or `advisor/010-pagination`.
- Commit: `feat(homework-2): paginate ticket list endpoint`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Repository — page + count

Change `findAll(filters)` to accept `limit`/`offset` in `TicketFilters` (add both as optional numbers to the type) and return `{ tickets: Ticket[]; total: number }`: run one `select count(*)` query with the same `where` conditions (drizzle: `select({ count: sql<number>`count(*)` })`), and the row query with `.limit(limit).offset(offset)`. Extract the condition-building into a private helper so both queries share it.

**Verify**: `npm --workspace backend run build` → exit 0.

### Step 2: Schema, service, controller

- `listTicketsSchema.querystring`: add `limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 }`, `offset: { type: 'integer', minimum: 0, default: 0 }` (Fastify applies defaults from schema).
- Service `listTickets` returns the repository's `{ tickets, total }` plus echoes `limit`/`offset`.
- Controller replies with `{ tickets, total, limit, offset }`.

**Verify**: `npm --workspace backend run build` → exit 0. Existing list tests will fail — fix them in Step 3.

### Step 3: Backend tests

Update existing assertions on `GET /tickets` (they expect a bare array — likely in `tests/test_ticket_api.test.ts`, `test_integration.test.ts`, `test_performance.test.ts`; grep: `grep -rn "GET.*'/api/v1/tickets'" backend/tests` and follow each). New cases:

1. Create 5 tickets → `GET /tickets?limit=2` → 2 tickets, `total: 5`, `limit: 2`, `offset: 0`.
2. `GET /tickets?limit=2&offset=4` → 1 ticket, `total: 5`.
3. `GET /tickets?limit=2&category=<x>` with 3 matching of 5 → `total: 3` (count respects filters).
4. `GET /tickets?limit=500` → 400 (schema max).
5. Default: `GET /tickets` with no params → `limit: 50, offset: 0` echoed.

**Verify**: `npm --workspace backend test` → all pass.

### Step 4: Frontend

- `frontend/src/types/ticket.ts`: add `TicketListResponse { tickets: Ticket[]; total: number; limit: number; offset: number }`.
- `api.ts` `listTickets`: accept optional `limit`/`offset`, return `Promise<TicketListResponse>`.
- `ticket-dashboard.tsx`: hold `{ tickets, total }` in state; add simple pager controls (Prev/Next buttons + "X–Y of total" label) driving `offset`; reset `offset` to 0 when filters change; `buildMetrics` gets `total` for the total-count card. Match the existing component style (shadcn `Button`, `useTransition` on filter changes — see `applyFilter` at line ~130).
- Update the frontend tests from plan 009 (`api.test.ts` list cases; dashboard render test now mocks the new shape).

**Verify**: `npm --workspace frontend test` → all pass; `npm --workspace frontend run build` → exit 0.

### Step 5: Docs

Update `backend/docs/API_REFERENCE.md` GET /tickets section: new params, new response shape, one example.

**Verify**: `grep -n 'offset' backend/docs/API_REFERENCE.md` → ≥1 match.

## Test plan

Steps 3–4. Full gate: `npm test` (root, both workspaces after plan 009), `npm --workspace frontend run build`.

## Done criteria

- [ ] `GET /tickets` returns `{ tickets, total, limit, offset }` (backend test asserts it)
- [ ] `npm --workspace backend test` and `npm --workspace frontend test` exit 0
- [ ] `npm --workspace frontend run build` exits 0
- [ ] API_REFERENCE.md documents the new contract
- [ ] `plans/README.md` status row updated

## STOP conditions

- Plan 009 has not run (no frontend test suite) — you may proceed, but say so in your report; the frontend edits then land without a net.
- Other consumers of `GET /tickets` exist beyond the dashboard and tests (grep the repo for `/tickets` fetches, e.g. in `demo/` or `wiki/`) — report them before changing the contract.
- The drizzle count-query construction fails typecheck twice — report; do not fall back to fetching all rows to count them.

## Maintenance notes

- Client-side search now only sees the loaded page — if users report "search misses tickets", the follow-up is a server-side `q` param (deferred deliberately).
- Plans 015/016 (export/stats spikes) both interact: export must NOT paginate (it streams the full filtered set); stats replace the page-scoped metric cards. Reviewer should keep those boundaries in mind.
