# Plan 013: API requires an API key — no anonymous CRUD over customer PII

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1fdba3b..HEAD -- homework-2/backend/src/ homework-2/frontend/src/lib/api.ts`
> Plans 003–012 legitimately touch these paths — check DONE rows in
> `plans/README.md`; on unexplained drift in `app.ts`, routes, or
> `error-handler.ts`, compare excerpts before proceeding.

## Status

- **Priority**: P3 (L effort; do after the S-effort fixes)
- **Effort**: L
- **Risk**: MED
- **Depends on**: plans/004-error-handler-preserve-4xx.md (401 error type), plans/006-security-hardening-bundle.md (CORS decisions interact)
- **Category**: security
- **Planned at**: commit `1fdba3b`, 2026-07-07

## Why this matters

Every endpoint — create, list, get, update, delete, bulk import, classify — is registered with no authentication hook, and tickets carry customer PII (email, name, customer_id). Anyone who can reach the API owns the entire dataset. For a coursework project on localhost this is survivable; the moment the backend is deployed anywhere reachable, it is not. This plan adds the smallest honest auth layer: a static API key via header, enforced by a Fastify `onRequest` hook, opt-out only for explicitly public routes (none today, health checks later).

**Context note**: the assignment scope (`TASKS.md`, `AGENTS.md`) does not require auth — this may be by-design for the homework. The operator chose to plan it anyway; if the operator later decides "localhost-only, skip it", mark this plan REJECTED in the index rather than executing.

## Current state

- `homework-2/backend/src/app.ts` (18 lines) — builds Fastify, registers CORS and `apiRoutes` under `/api/v1`, sets `errorHandler`. No auth anywhere.
- `homework-2/backend/src/modules/tickets/ticket.routes.ts:25-63` — 8 routes, none with `preHandler`/`onRequest` hooks.
- `homework-2/backend/src/shared/errors.ts` — `AppError` base with `statusCode`; subclasses `NotFoundError`, `ValidationError`, `ParseError` (read the file for exact constructor shapes before adding a sibling).
- Error handling: `AppError` instances → their own status + `{ error: message }` (`error-handler.ts:14-23`).
- Config convention: raw `process.env` reads (`server.ts:3-4`); after plan 006 also `CORS_ORIGINS` in `app.ts`.
- Frontend client: single fetch wrapper `request<T>()` in `frontend/src/lib/api.ts:12-31` — one place to add a header. `NEXT_PUBLIC_`-prefixed env vars are browser-visible in Next.js — the key WILL be visible to anyone using the frontend. That is acceptable for this project's threat model (key gates direct API access, not frontend users) — state this in the README section you write; do not pretend otherwise.
- Tests: every suite calls `buildApp()` + `app.inject()` — they all need the header or a test-mode bypass. Grep first: `grep -rln 'inject' backend/tests/ | wc -l` (expect ~8 files).

## Commands you will need

| Purpose | Command (from `homework-2/`) | Expected on success |
|---|---|---|
| Typecheck | `npm --workspace backend run build` | exit 0 |
| Backend tests | `npm --workspace backend test` | all pass |
| Frontend tests (if plan 009 ran) | `npm --workspace frontend test` | all pass |
| Full suite | `npm test` | all pass |

## Scope

**In scope**:
- `homework-2/backend/src/app.ts` (hook registration)
- `homework-2/backend/src/shared/auth.ts` (create), `src/shared/errors.ts` (add `UnauthorizedError`)
- `homework-2/backend/tests/helpers.ts` + minimal per-suite header additions
- `homework-2/frontend/src/lib/api.ts` (send the header)
- `backend/docs/API_REFERENCE.md`, `README.md` (auth section), `.env.example` files if plan 014 created them
- `plans/README.md` (status row)

**Out of scope**:
- Users, sessions, JWT, roles, per-ticket ownership — a static service key is the deliverable; multi-tenant authorization is a product decision deferred to the maintainer.
- Rate limiting.
- Cookie-based anything (keeps CORS posture simple — see plan 006 notes).

## Git workflow

- Branch: current or `advisor/013-auth`.
- Commit: `feat(homework-2): require API key authentication` (write the body normally, describing header name, env vars, and the dev-mode default behavior).
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: `UnauthorizedError` + auth hook

Add to `errors.ts` an `UnauthorizedError extends AppError` with `statusCode 401`, matching the existing subclass style. Create `src/shared/auth.ts`:

```ts
// Reads API_KEY from env once at registration.
// Behavior matrix (encode exactly):
//  - API_KEY set        → every request must send `x-api-key: <key>`; mismatch/missing → UnauthorizedError
//  - API_KEY unset, NODE_ENV === 'test' → hook allows all (tests unchanged by default)
//  - API_KEY unset otherwise → server logs a prominent warning at startup and allows all
//    (dev convenience; deployment guides must set the key)
export function apiKeyAuth(fastify: FastifyInstance): void {
  const apiKey = process.env.API_KEY;
  if (!apiKey) { /* warn (skip in test) and return without adding the hook */ }
  fastify.addHook('onRequest', async (request) => {
    if (request.headers['x-api-key'] !== apiKey) throw new UnauthorizedError('Invalid or missing API key');
  });
}
```

Wire in `app.ts` after CORS, before route registration. Use constant-time comparison (`crypto.timingSafeEqual` on equal-length buffers, with a length check) rather than `!==` — keys are secrets.

**Verify**: `npm --workspace backend run build` → exit 0; `npm --workspace backend test` → all pass (API_KEY unset + NODE_ENV=test → bypass).

### Step 2: Auth tests

New `backend/tests/test_auth.test.ts`. Set `process.env.API_KEY = 'test-key-123'` inside the suite (and delete it in `afterAll` so other suites keep the bypass — suites run `--runInBand`, so env mutation is ordered but MUST be cleaned up):

1. No header → 401 `{ error: 'Invalid or missing API key' }`.
2. Wrong key → 401.
3. Correct `x-api-key` → 200 on `GET /api/v1/tickets`.
4. Key of different length than expected → 401 (guards the timingSafeEqual length branch, no crash).

**Verify**: `npm --workspace backend test` → all pass including the 4 new tests.

### Step 3: Frontend sends the key

In `frontend/src/lib/api.ts` `request()`, add the header when configured:

```ts
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
// in headers: ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
```

Update the plan-009 test for header presence if that suite exists.

**Verify**: `npm --workspace frontend run build` → exit 0; frontend tests pass if present.

### Step 4: Documentation

- `backend/docs/API_REFERENCE.md`: an "Authentication" section at the top — header name, 401 shape, env vars (`API_KEY` backend, `NEXT_PUBLIC_API_KEY` frontend), and one curl example with the header.
- `README.md`: setup addition + the explicit note that `NEXT_PUBLIC_API_KEY` is browser-visible and what that means.
- `.env.example` files (if plan 014 created them): add both vars with placeholder values like `change-me` — never a real key.

**Verify**: `grep -n 'x-api-key' backend/docs/API_REFERENCE.md README.md` → matches in both.

## Test plan

Step 2 (backend) + updated frontend header test. Full gate: `npm test`.

## Done criteria

- [ ] With `API_KEY` set, unauthenticated `app.inject` requests get 401 (test-proven)
- [ ] With `API_KEY` unset and `NODE_ENV=test`, all pre-existing suites pass unmodified
- [ ] Comparison is constant-time (`timingSafeEqual` present in `auth.ts`)
- [ ] No real key value appears anywhere in the diff (placeholders only)
- [ ] `npm test` exits 0; docs updated
- [ ] `plans/README.md` status row updated

## STOP conditions

- Throwing from an `onRequest` hook doesn't route through `setErrorHandler` in the installed Fastify 5 (401 arrives without the `{ error }` shape) — check Fastify docs for hook-error semantics; adjust to `reply.code(401).send(...)` in the hook if needed; STOP if two attempts fail tests.
- Existing suites break because some helper caches env state across suites — report rather than adding bypass hacks.
- The operator's deployment story requires per-user auth (you find session/user code anywhere in the repo) — this plan's premise is wrong; STOP.

## Maintenance notes

- The dev-mode "no key = open" default is the sharpest edge: deployment checklists must set `API_KEY`. Reviewer should confirm the startup warning is loud (not `debug` level).
- When multi-user auth arrives, this hook is the seam: replace key comparison with session/JWT verification without touching routes.
- CORS (plan 006) + this key are independent layers; revisit both together if cookies ever enter.
