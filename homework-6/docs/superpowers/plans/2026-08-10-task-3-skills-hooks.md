# Task 3 Skills & Hooks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the minimum scope of Task 3: Give all custom Claude commands the prefix `hw6-` and safely test the coverage gate without the actual `git push`.

**Architecture:** Claude commands remain Markdown entry points in `.claude/commands/`, and `.claude/settings.json` connects the shell hook to `PreToolUse` for Bash. Hook recognizes `git push`, delegates verification to existing `npm run test:coverage`, and relies on thresholds from `vitest.config.ts`.

**Tech Stack:** Claude Code project commands, POSIX shell, Node.js, npm, Vitest coverage.

## Global Constraints

- All AI meta-agents, project skills and Claude teams created for Homework 6 have the prefix `hw6-`.
- Coverage gate blocks push if coverage is below 80% or coverage run ends with an error.
- Screenshots are not created at this stage.
- Do not change TypeScript pipeline or business logic.
- Don't do `git add`, `git commit` or real `git push`.
- `docs/log.md` update only append-only.

---

### Task 1: Unify the names of Claude commands

**Files:**
- Move: `.claude/commands/validate-transactions.md` → `.claude/commands/hw6-validate-transactions.md`
- Move: `.claude/commands/write-spec.md` → `.claude/commands/hw6-write-spec.md`
- Modify: `.claude/commands/hw6-validate-transactions.md`
- Modify: `.claude/commands/hw6-write-spec.md`
- Modify: `.claude/agents/hw6-specification-agent.md`
- Modify: `.claude/skills/hw6-writing-feature-specifications/SKILL.md`
- Modify: `README.md`
- Modify: `docs/research-notes.md`

**Interfaces:**
- Consumes: available `/hw6-run-pipeline`, `/validate-transactions`, `/write-spec` workflows.
- Produces: `/hw6-run-pipeline`, `/hw6-validate-transactions`, `/hw6-write-spec` as uniquely project-owned entry points.

- [x] **Step 1: Fix current failing naming check**

Run:

```bash
find .claude/commands -maxdepth 1 -type f ! -name 'hw6-*' -print
```

Expected: output contains `.claude/commands/validate-transactions.md` and `.claude/commands/write-spec.md`.

- [x] **Step 2: Rename the two command files**

Apply filesystem rename without staging. Inside the command prompts, replace the user-facing names with `/hw6-validate-transactions` and `/hw6-write-spec`.

- [x] **Step 3: Update active links**

Replace user-facing `/write-spec` and `/validate-transactions` with prefixed names in `README.md`, `docs/research-notes.md`, `hw6-specification-agent` and project skill. Do not overwrite historical records `docs/log.md`, old design docs or implementation plans.

- [x] **Step 4: Check naming gate**

Run:

```bash
find .claude/commands -maxdepth 1 -type f ! -name 'hw6-*' -print
rg -n '/(write-spec|validate-transactions)' README.md docs/research-notes.md .claude/agents .claude/skills/hw6-writing-feature-specifications .claude/commands
```

Expected: `find` and `rg` do not return unprefixed project command names.

### Task 2: Check the coverage gate

**Files:**
- Verify: `.claude/hooks/coverage-gate.sh`
- Verify: `.claude/settings.json`
- Verify: `vitest.config.ts`
- Modify: `docs/log.md`

**Interfaces:**
- Consumes: Claude Code `PreToolUse` JSON with field `tool_input.command`.
- Produces: exit code `0` for non-push or successful coverage run; exit code `2` for failed coverage run before push.

- [x] **Step 1: Check shell syntax and non-push path**

Run:

```bash
sh -n .claude/hooks/coverage-gate.sh
printf '%s' '{"tool_input":{"command":"git status"}}' | CLAUDE_PROJECT_DIR="$PWD" .claude/hooks/coverage-gate.sh
```

Expected: both commands end with exit code `0`, coverage is not started.

- [x] **Step 2: Check configured threshold**

Run:

```bash
rg -n 'lines: 80|functions: 80|branches: 80|statements: 80' vitest.config.ts
```

Expected: found all four thresholds with the value `80`.

- [x] **Step 3: Check successful push simulation**

Run without real push:

```bash
printf '%s' '{"tool_input":{"command":"git push"}}' | CLAUDE_PROJECT_DIR="$PWD" .claude/hooks/coverage-gate.sh
```

Expected: hook starts `npm run test:coverage`, coverage passes, hook ends with exit code `0`.

- [x] **Step 4: Perform a general static check**

Run:

```bash
npm run typecheck
git diff --check
```

Expected: both commands end with exit code `0`.

- [x] **Step 5: Update log**

Append to `docs/log.md` the `implement` or `verify` entry with the files actually renamed and the commands actually run. Do not claim about failed-gate simulation or screenshots that were not executed.

- [x] **Step 6: Offer commit title without staging**

Suggested title:

```text
chore: complete hw6 skills and coverage gate
```
