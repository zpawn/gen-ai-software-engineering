# Plan 001: Add a CI workflow so tests, typecheck, and builds run on every push/PR

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1fdba3b..HEAD -- homework-2/package.json homework-2/backend/package.json .github/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `1fdba3b`, 2026-07-07

## Why this matters

The repository has no CI configuration at all — no `.github/workflows/` directory exists at the git root. Backend tests (which enforce ≥85% coverage via `jest.config.cjs`) and both builds only run when someone remembers to run them locally. Every other improvement plan in `plans/` relies on `npm test` as its verification gate; running that gate automatically on every push is the verification baseline that makes the riskier plans safe to execute.

## Current state

- Git repository root: `/Users/illia.mak/projects/other/gen-ai-software-engineering` (the project being audited lives in the `homework-2/` subdirectory of it).
- `.github/workflows/` does not exist at the git root. Verify: `ls .github/workflows` from the git root → "No such file or directory".
- `homework-2/package.json` — npm workspaces root (`backend`, `frontend`) with scripts:

```json
"scripts": {
  "dev:backend": "PORT=3001 npm --workspace backend run dev",
  "dev:frontend": "npm --workspace frontend run dev",
  "build": "npm --workspace backend run build && npm --workspace frontend run build",
  "test": "npm --workspace backend test",
  "test:coverage": "npm --workspace backend run test:coverage",
  ...
}
```

- `homework-2/backend/package.json` — `"build": "tsc --noEmit"` (typecheck), `"test"` runs Jest with `--experimental-vm-modules --runInBand`.
- `homework-2/frontend/package.json` — `"build": "next build"`. Note: `"lint": "next lint"` is currently broken (Next 16 removed `next lint`); do NOT add a lint step to CI in this plan — plan 002 fixes lint and will extend CI.
- Tests use an in-memory SQLite DB (`NODE_ENV=test` → `createDatabase()` → `:memory:` in `homework-2/backend/src/config/database.ts:12`), so CI needs no database service.
- `better-sqlite3` is a native module — it compiles during `npm ci` on ubuntu-latest without extra setup.

## Commands you will need

| Purpose | Command (run from `homework-2/`) | Expected on success |
|---|---|---|
| Install | `npm ci` | exit 0 |
| Backend tests + coverage | `npm run test:coverage` | all pass, coverage thresholds met, exit 0 |
| Backend typecheck | `npm --workspace backend run build` | exit 0, no output |
| Full build | `npm run build` | exit 0 |

## Scope

**In scope** (the only files you should create/modify):
- `.github/workflows/homework-2-ci.yml` (create, at the git root)
- `plans/README.md` (status row update)

**Out of scope** (do NOT touch):
- Any file under `homework-2/backend/src/` or `homework-2/frontend/src/`
- `homework-2/package.json` scripts — CI must call existing scripts, not add new ones
- Other homework directories at the git root (`homework-1/`, `classwork-2/`, …)

## Git workflow

- Branch: current branch (`homework-2-submission`) or `advisor/001-ci` if the operator prefers.
- Commit style (from `git log`): conventional commits, e.g. `feat(homework-2): implemented rest api`. Use `ci(homework-2): add GitHub Actions workflow`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create the workflow file

Create `.github/workflows/homework-2-ci.yml` at the git root:

```yaml
name: homework-2 CI

on:
  push:
    paths: ['homework-2/**', '.github/workflows/homework-2-ci.yml']
  pull_request:
    paths: ['homework-2/**', '.github/workflows/homework-2-ci.yml']

defaults:
  run:
    working-directory: homework-2

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: homework-2/package-lock.json
      - run: npm ci
      - run: npm --workspace backend run build
      - run: npm run test:coverage
      - run: npm --workspace frontend run build
```

**Verify**: `npx --yes yaml-lint .github/workflows/homework-2-ci.yml` (or `node -e "require('js-yaml')"` equivalent; if neither is available, any YAML parse check) → valid YAML. If no YAML tool is available, visually confirm indentation and proceed.

### Step 2: Prove the CI commands pass locally

Run, from `homework-2/`, exactly the commands the workflow runs:

**Verify**: `npm ci && npm --workspace backend run build && npm run test:coverage && npm --workspace frontend run build` → each exits 0; Jest reports all suites passing and coverage ≥ thresholds.

## Test plan

No new tests — this plan wires existing ones into CI. The verification is Step 2 (the exact CI command sequence passes locally).

## Done criteria

- [ ] `.github/workflows/homework-2-ci.yml` exists and is valid YAML
- [ ] `npm run test:coverage` exits 0 from `homework-2/`
- [ ] `npm --workspace backend run build` exits 0
- [ ] `npm --workspace frontend run build` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `.github/workflows/` already exists with a workflow covering homework-2 (another plan/person got there first).
- `npm ci` fails (lockfile drift) — do not regenerate the lockfile; report it.
- `npm run test:coverage` fails locally before any change of yours — the baseline itself is broken; report which suite fails.
- `npm --workspace frontend run build` fails — the frontend build is broken independently of this plan; report the error, and ship the workflow with the frontend build step commented out plus a TODO comment referencing this stop.

## Maintenance notes

- Plan 002 (lint/typecheck tooling) adds `lint` and frontend `typecheck` steps to this workflow — expect it to edit this file.
- Plan 009 (frontend tests) adds a frontend test step here too.
- Reviewer: check the `paths:` filters — they keep unrelated homework directories from triggering this workflow.
