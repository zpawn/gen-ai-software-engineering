# Plan 002: Working lint, format, and typecheck commands in both workspaces

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1fdba3b..HEAD -- homework-2/frontend/package.json homework-2/backend/package.json homework-2/package.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/001-ci-verification-baseline.md (extends its workflow)
- **Category**: dx
- **Planned at**: commit `1fdba3b`, 2026-07-07

## Why this matters

There is no lint or format tooling anywhere in the repo — no ESLint config, no Prettier, no `.editorconfig`. The frontend's only quality script, `"lint": "next lint"`, is broken: `next lint` was removed from the Next 16 CLI and no ESLint config or dependency exists in `frontend/`. The frontend also has no standalone typecheck — type errors surface only during a full `next build`. This plan gives both workspaces working `lint` and `typecheck` commands and wires them into CI.

## Current state

- `homework-2/frontend/package.json` scripts: `"dev": "next dev", "build": "next build", "start": "next start", "lint": "next lint"`. Deps include `next ^16.2.10`, `react ^19.2.7`, `typescript ^6.0.3` (devDep). No `eslint` anywhere.
- `homework-2/backend/package.json` — no `lint` script; `"build": "tsc --noEmit"` doubles as typecheck. TypeScript `^6.0.3`.
- No `.eslintrc*`, `eslint.config.*`, `.prettierrc*`, or `.editorconfig` at root, `backend/`, or `frontend/`. Verify: `find homework-2 -maxdepth 2 -name 'eslint.config.*' -not -path '*/node_modules/*'` → empty.
- `homework-2/frontend/AGENTS.md` warns: "This is NOT the Next.js you know … Read the relevant guide in `node_modules/next/dist/docs/` before writing any code." Honor it: check `frontend/node_modules/next/dist/docs/` for the current ESLint setup guidance before Step 2.
- CI workflow from plan 001: `.github/workflows/homework-2-ci.yml` at the git root.

## Commands you will need

| Purpose | Command (from `homework-2/`) | Expected on success |
|---|---|---|
| Install | `npm install` | exit 0 |
| Backend typecheck | `npm --workspace backend run build` | exit 0 |
| Backend tests | `npm test` | all pass |
| Frontend build | `npm --workspace frontend run build` | exit 0 |

## Suggested executor toolkit

- Read `frontend/node_modules/next/dist/docs/` guides on ESLint/linting before configuring the frontend — the repo pins a Next version that may differ from your training data.
- Skill `vercel-react-best-practices` (in `.agents/skills/`) is context for frontend code style, not required here.

## Scope

**In scope**:
- `homework-2/frontend/package.json` (scripts + devDeps)
- `homework-2/backend/package.json` (scripts + devDeps)
- `homework-2/package.json` (aggregate scripts)
- `homework-2/frontend/eslint.config.mjs` (create)
- `homework-2/backend/eslint.config.mjs` (create)
- `homework-2/.editorconfig` (create)
- `.github/workflows/homework-2-ci.yml` (add lint/typecheck steps)
- `plans/README.md` (status row)

**Out of scope**:
- Fixing lint findings in source files beyond trivially safe autofixes (`--fix` on formatting-class rules). If lint reports real code problems, record them in the report — several are already covered by other plans (003–008); do not fix them here.
- Prettier — optional; skip unless the operator asks. `.editorconfig` covers the basics.

## Git workflow

- Branch: current (`homework-2-submission`) or `advisor/002-lint`.
- Commit style: conventional commits — `chore(homework-2): add eslint and typecheck tooling`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Backend ESLint

Add devDeps to `backend/`: `eslint`, `typescript-eslint`, `@eslint/js`. Create `homework-2/backend/eslint.config.mjs`:

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['coverage/**', 'drizzle/**', 'data/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
```

Add script to `backend/package.json`: `"lint": "eslint src tests"`.

**Verify**: `npm --workspace backend run lint` → exits 0, or reports findings. If findings appear: apply only safe autofixes (`npm --workspace backend run lint -- --fix`), then downgrade any remaining rules that flag existing intentional patterns to `warn` in the config, and list every downgrade in your report.

### Step 2: Frontend ESLint + typecheck

First read the linting guidance in `frontend/node_modules/next/dist/docs/` (search for "eslint": `grep -ril eslint frontend/node_modules/next/dist/docs/ | head`). Follow the documented Next 16 setup. Expected shape (adjust to what the docs say):

- devDeps: `eslint`, `eslint-config-next` (version matching `next`).
- `homework-2/frontend/eslint.config.mjs` using the flat-config export documented for Next 16.
- Replace the script: `"lint": "eslint ."` and add `"typecheck": "tsc --noEmit"`.

**Verify**: `npm --workspace frontend run lint` → exit 0 (after safe autofixes, same policy as Step 1) AND `npm --workspace frontend run typecheck` → exit 0.

### Step 3: Root aggregate scripts + `.editorconfig`

In `homework-2/package.json` add:

```json
"lint": "npm --workspace backend run lint && npm --workspace frontend run lint",
"typecheck": "npm --workspace backend run build && npm --workspace frontend run typecheck"
```

Create `homework-2/.editorconfig` (2-space indent, LF, UTF-8, final newline — matching the existing source files).

**Verify**: `npm run lint && npm run typecheck` from `homework-2/` → exit 0.

### Step 4: Wire into CI

In `.github/workflows/homework-2-ci.yml`, after `npm ci`, add steps `npm run lint` and `npm run typecheck` before the test step.

**Verify**: re-run the workflow's command sequence locally: `npm ci && npm run lint && npm run typecheck && npm run test:coverage && npm --workspace frontend run build` → exit 0.

## Test plan

No new tests. Gate: existing suite still passes (`npm test`) and the four new scripts exit 0.

## Done criteria

- [ ] `npm run lint` exits 0 from `homework-2/`
- [ ] `npm run typecheck` exits 0
- [ ] `grep -n '"lint": "next lint"' frontend/package.json` → no match
- [ ] `npm test` exits 0 (nothing functional changed)
- [ ] CI workflow contains lint + typecheck steps
- [ ] `plans/README.md` status row updated

## STOP conditions

- `frontend/node_modules/next/dist/docs/` contradicts this plan's assumed setup (e.g. Next 16 ships a different lint story entirely) — follow the docs if the change is small; STOP if it requires new scope.
- Lint reports >30 errors that autofix can't clear in either workspace — don't mass-disable rules; report the categories.
- `eslint-config-next` has no release compatible with `next ^16.2.10` — STOP and report; configure plain `typescript-eslint` for the frontend as fallback only if the operator approves.

## Maintenance notes

- Plans 003–013 assume `npm run lint`/`npm run typecheck` may exist; they treat them as optional gates. Once this lands, executors get a stronger safety net.
- Reviewer: scrutinize any rule downgraded to `warn` — each one is a deferred cleanup.
