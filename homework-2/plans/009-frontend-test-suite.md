# Plan 009: Frontend has a test suite — API client covered, key components smoke-tested

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1fdba3b..HEAD -- homework-2/frontend/`
> If any in-scope file changed, compare "Current state" excerpts against live
> code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/001-ci-verification-baseline.md (adds a CI step there)
- **Category**: tests
- **Planned at**: commit `1fdba3b`, 2026-07-07

## Why this matters

The entire Next.js frontend — 8 exported API functions and the two main page components — has zero tests, no test runner, and no test script. The whole client half of the product (filtering, creation, import, classification, status updates) can regress silently. This plan adds Vitest + React Testing Library, covers the API client thoroughly, smoke-tests the components, and wires it all into the root `test` script and CI. It should land before pagination (plan 010), which will modify the same files.

## Current state

- `homework-2/frontend/package.json` — scripts: `dev/build/start/lint` only; no test runner in deps. Deps: `next ^16.2.10`, `react ^19.2.7`, `react-dom ^19.2.7`, `@base-ui/react`, shadcn-style UI components in `src/components/ui/`. devDeps: `typescript ^6.0.3`, `@types/react ^19.2.17`.
- `homework-2/frontend/src/lib/api.ts` (79 lines) — the API client. Core:

```ts
// line 3
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';

// lines 12-31: request<T>() — fetch wrapper:
//   - merges JSON content-type header
//   - !response.ok → parses body, throws new Error(error.error ?? 'Request failed')
//   - response.status === 204 → returns undefined
//   - otherwise response.json()

// exported: listTickets(filters) (builds URLSearchParams, skips falsy values),
// getTicket(id), createTicket(payload) → POST /tickets?auto_classify=true,
// importTickets(format, content) → POST /tickets/import (auto_classify: true),
// autoClassifyTicket(id) → POST /tickets/:id/auto-classify?force=true,
// updateTicketStatus(id, status) → PUT /tickets/:id, deleteTicket(id) → DELETE (204)
```

- `homework-2/frontend/src/components/ticket-dashboard.tsx` — client component: fetches the full ticket list on mount and after mutations, client-side search/filter, metric cards, create + import dialogs.
- `homework-2/frontend/src/components/ticket-detail-page.tsx` — detail view: ticket fields, status select, auto-classify button, classification log.
- `homework-2/frontend/src/types/ticket.ts` — shared types.
- `homework-2/frontend/AGENTS.md`: "This is NOT the Next.js you know … Read the relevant guide in `node_modules/next/dist/docs/` before writing any code." Check those docs for the current testing guidance (search: `grep -ril -e vitest -e testing frontend/node_modules/next/dist/docs/ | head`).
- Root `homework-2/package.json`: `"test": "npm --workspace backend test"` — backend only.
- Backend test conventions (for style continuity): plain describe/it, explicit assertions, fixture factory (`backend/tests/helpers.ts` exports `ticketInput(overrides)`); mirror the factory idea with a `ticketFixture(overrides)` helper.

## Commands you will need

| Purpose | Command (from `homework-2/`) | Expected on success |
|---|---|---|
| Install | `npm install` | exit 0 |
| Frontend tests (after this plan) | `npm --workspace frontend test` | all pass |
| Backend tests (unchanged) | `npm --workspace backend test` | all pass |
| Frontend build | `npm --workspace frontend run build` | exit 0 |

## Suggested executor toolkit

- Read the testing guide in `frontend/node_modules/next/dist/docs/` before configuring Vitest with Next 16 — follow it over this plan's config sketch if they differ.
- Skill `vercel-react-best-practices` in `.agents/skills/` — reference for component patterns, optional.

## Scope

**In scope**:
- `homework-2/frontend/package.json` (devDeps + `test` script)
- `homework-2/frontend/vitest.config.mts` (create)
- `homework-2/frontend/src/lib/api.test.ts` (create)
- `homework-2/frontend/src/components/ticket-dashboard.test.tsx` (create)
- `homework-2/frontend/src/components/ticket-detail-page.test.tsx` (create)
- `homework-2/frontend/src/test/` (setup + fixtures, create as needed)
- `homework-2/package.json` (root `test` fans out to both workspaces)
- `.github/workflows/homework-2-ci.yml` (add frontend test step)
- `plans/README.md` (status row)

**Out of scope**:
- Any change to `api.ts`, components, or types — tests characterize current behavior; if a test reveals a bug, record it in your report, don't fix it here.
- E2E/Playwright — deliberately deferred.
- `src/components/ui/*` (shadcn primitives) — don't test vendored UI atoms.

## Git workflow

- Branch: current or `advisor/009-frontend-tests`.
- Commit: `test(homework-2): add frontend vitest suite`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Tooling

Add frontend devDeps: `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`. Create `vitest.config.mts` (react plugin, `environment: 'jsdom'`, setup file importing `@testing-library/jest-dom/vitest`, alias `@` → `./src` if `tsconfig.json` defines it — check `frontend/tsconfig.json` `paths`). Add script `"test": "vitest run"`.

**Verify**: `npm install` → exit 0; `npm --workspace frontend test` → "no test files found" exit code is acceptable at this step (or add a trivial passing test).

### Step 2: API client tests (`src/lib/api.test.ts`)

Stub global `fetch` with `vi.stubGlobal`. Cases:

1. `listTickets({ category: 'billing_question', status: '' })` → fetch called with URL ending `/tickets?category=billing_question` (falsy values skipped).
2. `listTickets({})` → URL ends `/tickets` (no `?`).
3. `createTicket(payload)` → POST to `/tickets?auto_classify=true`, body JSON-round-trips to payload, `content-type: application/json` header present.
4. Non-2xx with JSON body `{ error: 'Validation failed' }` → rejects with `Error('Validation failed')`.
5. Non-2xx with non-JSON body → rejects with `Error('Request failed')` (the `.catch` fallback at `api.ts:22`).
6. `deleteTicket` with a 204 response → resolves to `undefined` without calling `response.json()`.
7. `updateTicketStatus('id-1', 'resolved')` → PUT `/tickets/id-1` with body `{"status":"resolved"}`.

**Verify**: `npm --workspace frontend test` → 7+ tests pass.

### Step 3: Component smoke tests

Mock the entire `../lib/api` module with `vi.mock`. Create `src/test/fixtures.ts` with `ticketFixture(overrides)` returning a complete `Ticket` (copy field shape from `src/types/ticket.ts`).

`ticket-dashboard.test.tsx`:
1. Renders with `listTickets` resolving to 2 fixtures → both subjects appear.
2. `listTickets` rejecting → error state renders (locate the error UI in the component first).
3. Search input filters the visible rows (type a subject substring via `user-event`).

`ticket-detail-page.test.tsx`:
4. Renders fixture fields (subject, status, category).
5. Status select change calls `updateTicketStatus` with the ticket id and the new status.

These are Next 16 client components — if either component uses `next/navigation` hooks, mock that module too (`useRouter`, `useParams`).

**Verify**: `npm --workspace frontend test` → all pass.

### Step 4: Root script + CI

Root `package.json`: `"test": "npm --workspace backend test && npm --workspace frontend test"`. Add `npm --workspace frontend test` step to `.github/workflows/homework-2-ci.yml` (if plan 001 hasn't run yet, skip the CI edit and note it in your report).

**Verify**: `npm test` from `homework-2/` → backend + frontend suites both pass.

## Test plan

This plan IS the test plan. Final gate: `npm test` (both workspaces) and `npm --workspace frontend run build` both exit 0.

## Done criteria

- [ ] `npm --workspace frontend test` exits 0 with ≥12 tests
- [ ] `npm test` (root) runs both workspaces and exits 0
- [ ] `npm --workspace frontend run build` still exits 0
- [ ] No changes to `src/lib/api.ts`, components, or types (`git diff --stat` shows only in-scope files)
- [ ] `plans/README.md` status row updated

## STOP conditions

- Vitest + Next 16 + React 19 integration fails at config level after two attempts (e.g. plugin incompatibility) — report the exact error; do not downgrade React/Next.
- Components depend on server-only APIs that jsdom can't satisfy even with mocks — report which; component tests may shrink to render-only, but say so.
- A test exposes an actual bug in `api.ts` or a component — characterize the current behavior in the test with a `// BUG:` comment and report it; do not fix the source.

## Maintenance notes

- Plan 010 (pagination) modifies `api.ts` and the dashboard — these tests are its safety net; expect it to update cases 1-2.
- Reviewer: check mocks assert on request shape (URL/method/body), not just call counts — that's what catches contract drift with the backend.
