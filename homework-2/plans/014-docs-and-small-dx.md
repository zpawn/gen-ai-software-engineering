# Plan 014: Docs and small DX fixes — accurate README, `.env.example`, honest perf test, aligned port defaults

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1fdba3b..HEAD -- homework-2/README.md homework-2/backend/docs/API_REFERENCE.md homework-2/backend/tests/test_performance.test.ts homework-2/backend/src/server.ts`
> If any in-scope file changed, compare "Current state" excerpts against live
> code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `1fdba3b`, 2026-07-07

## Why this matters

Four small, actively-misleading things: the README setup block lists two long-running dev servers as sequential steps; required env vars are undocumented with no `.env.example`; the "performance" test asserts only correctness (a latency regression passes); the backend's direct default port (3000) collides with the frontend and contradicts the README, working only because the root script overrides it. Each costs a contributor real confusion; all are minutes to fix.

## Current state

- `homework-2/README.md` setup block (lines ~29-36):

```bash
npm install
npm run db:seed
npm run dev:backend
npm run dev:frontend
```

`dev:backend` and `dev:frontend` block forever — a reader following linearly never starts the frontend. README also documents "Backend API: `http://localhost:3001/api/v1`".

- Port defaults: `homework-2/package.json` — `"dev:backend": "PORT=3001 npm --workspace backend run dev"`; but `backend/src/server.ts:3` — `const PORT = Number(process.env.PORT) || 3000;`. Running the backend directly (`npm --workspace backend run dev`) lands on 3000, colliding with Next dev and contradicting the README and the frontend default (`frontend/src/lib/api.ts:3` → `http://localhost:3001/api/v1`).
- No `.env.example` anywhere; env vars in use: `PORT`, `HOST` (`server.ts:3-4`), `NEXT_PUBLIC_API_BASE_URL` (`api.ts:3`), plus `CORS_ORIGINS` and `API_KEY`/`NEXT_PUBLIC_API_KEY` if plans 006/013 have run (check `plans/README.md` status).
- `homework-2/backend/tests/test_performance.test.ts` — fires 20 concurrent creates, asserts 201s and list length 20. No timing assertion. It is a concurrency smoke test labeled "performance".
- `homework-2/backend/docs/API_REFERENCE.md` (~line 46-56) — import example response shows `"successful": 1` alongside `"tickets": []`; the real endpoint returns created tickets in `tickets` (integration test asserts `tickets[0].category`).
- README line 5: "AI Tools Used: Codex" — stale given committed `CLAUDE.md`/`GEMINI.md`/`AGENTS.md` agent docs.

## Commands you will need

| Purpose | Command (from `homework-2/`) | Expected on success |
|---|---|---|
| Tests | `npm test` | all pass |
| Direct backend run check | `npm --workspace backend run dev` (then Ctrl-C) | listens on 3001 after Step 2 |

## Scope

**In scope**:
- `homework-2/README.md`
- `homework-2/.env.example`, `homework-2/frontend/.env.example` (create)
- `homework-2/backend/src/server.ts` (one default value)
- `homework-2/backend/tests/test_performance.test.ts` (rename/re-scope)
- `homework-2/backend/docs/API_REFERENCE.md` (import example)
- `plans/README.md` (status row)

**Out of scope**:
- Any behavior change beyond the port default.
- Rewriting API_REFERENCE beyond the one wrong example (the rest was verified accurate against `ticket.routes.ts`).
- `.gitignore` (already ignores `.env`).

## Git workflow

- Branch: current or `advisor/014-docs-dx`.
- Commit: `docs(homework-2): fix setup docs, add env examples, align port default`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: README

- Split the run steps: "Terminal 1: `npm run dev:backend` (API on http://localhost:3001)" / "Terminal 2: `npm run dev:frontend` (app on http://localhost:3000)", with `npm install` + `npm run db:seed` before them and a note that the frontend expects the backend on 3001 (override via `NEXT_PUBLIC_API_BASE_URL`, see `.env.example`).
- Update the AI-tools line to reflect reality (Codex + the committed Claude/Gemini agent docs).

**Verify**: read the block top-to-bottom as a first-time user — every command either terminates or is explicitly marked as a long-running server in its own terminal.

### Step 2: Align the backend port default

In `server.ts:3`: `const PORT = Number(process.env.PORT) || 3001;`. Optionally simplify the root script to plain `npm --workspace backend run dev` (keep `PORT=3001` if you prefer explicitness — either is fine; be consistent with the README).

**Verify**: `npm --workspace backend run dev` → log line says `http://localhost:3001`; Ctrl-C. `npm test` → still green (tests use `app.inject`, no port binding).

### Step 3: `.env.example` files

`homework-2/.env.example`:

```
# Backend
PORT=3001
HOST=0.0.0.0
# CORS_ORIGINS=http://localhost:3000   (if plan 006 has run — check plans/README.md)
# API_KEY=change-me                    (if plan 013 has run)
```

`homework-2/frontend/.env.example`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
# NEXT_PUBLIC_API_KEY=change-me        (if plan 013 has run)
```

Include the conditional lines only for plans that are DONE; reference both files from the README setup section. Placeholder values only — never real secrets.

**Verify**: `ls homework-2/.env.example homework-2/frontend/.env.example` → both exist; `git check-ignore .env.example` → NOT ignored (they must be committed).

### Step 4: Honest performance test

In `test_performance.test.ts`, keep the concurrency assertions and add a generous wall-clock budget so the label is honest without flaking:

```ts
const startedAt = performance.now();
// ...existing 20 concurrent creates...
const elapsed = performance.now() - startedAt;
expect(elapsed).toBeLessThan(5_000); // generous ceiling; guards order-of-magnitude regressions only
```

Rename the describe block to say what it now is: "create endpoint: 20 concurrent requests complete correctly within budget".

**Verify**: `npm test` → passes; run twice to confirm no flake headroom issues.

### Step 5: Fix the API_REFERENCE import example

Populate the example's `tickets` array with one representative created-ticket object consistent with `"successful": 1` (copy a realistic shape from a test fixture or an actual response).

**Verify**: the example's `successful` count equals its `tickets` array length.

## Test plan

`npm test` after Steps 2 and 4. No new suites.

## Done criteria

- [ ] README run instructions are two-terminal and match actual ports
- [ ] `server.ts` default port is 3001; direct backend run binds 3001
- [ ] Both `.env.example` files exist, committed, placeholders only
- [ ] Performance test asserts a time budget; suite passes twice in a row
- [ ] API_REFERENCE import example is internally consistent
- [ ] `npm test` exits 0; `plans/README.md` status row updated

## STOP conditions

- Anything else in the repo hardcodes port 3000 for the backend (grep `3000` across `homework-2/` excluding node_modules) with unclear intent — report before changing.
- The 5s budget flakes in CI (if plan 001 ran) — raise to 10s once; if still flaky, drop the timing assertion and report.

## Maintenance notes

- Plans 006/013 add env vars — whichever of {006, 013, 014} lands last must reconcile `.env.example` (each plan says so).
- Reviewer: `.env.example` must never gain real values; check the diff for anything that looks like a live key.
