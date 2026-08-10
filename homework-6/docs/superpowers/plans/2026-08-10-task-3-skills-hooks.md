# Task 3 Skills & Hooks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Завершити мінімальний обсяг Task 3: дати всім власним Claude-командам префікс `hw6-` і безпечно перевірити coverage gate без реального `git push`.

**Architecture:** Claude-команди залишаються Markdown entry points у `.claude/commands/`, а `.claude/settings.json` підключає shell hook до `PreToolUse` для Bash. Hook розпізнає `git push`, делегує перевірку наявному `npm run test:coverage` і покладається на thresholds із `vitest.config.ts`.

**Tech Stack:** Claude Code project commands, POSIX shell, Node.js, npm, Vitest coverage.

## Global Constraints

- Усі створені для Homework 6 AI meta-agents, project skills і Claude-команди мають префікс `hw6-`.
- Coverage gate блокує push, якщо coverage нижче 80% або coverage run завершується помилкою.
- Скриншоти не створюються в цьому етапі.
- Не змінювати TypeScript pipeline або бізнес-логіку.
- Не виконувати `git add`, `git commit` або справжній `git push`.
- `docs/log.md` оновлювати лише append-only.

---

### Task 1: Уніфікувати назви Claude-команд

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
- Consumes: наявні `/hw6-run-pipeline`, `/validate-transactions`, `/write-spec` workflows.
- Produces: `/hw6-run-pipeline`, `/hw6-validate-transactions`, `/hw6-write-spec` як однозначно project-owned entry points.

- [x] **Step 1: Зафіксувати поточний failing naming check**

Run:

```bash
find .claude/commands -maxdepth 1 -type f ! -name 'hw6-*' -print
```

Expected: output містить `.claude/commands/validate-transactions.md` і `.claude/commands/write-spec.md`.

- [x] **Step 2: Перейменувати два command files**

Застосувати filesystem rename без staging. Усередині command prompts замінити user-facing назви на `/hw6-validate-transactions` і `/hw6-write-spec`.

- [x] **Step 3: Оновити активні посилання**

Замінити user-facing `/write-spec` і `/validate-transactions` на prefixed names у `README.md`, `docs/research-notes.md`, `hw6-specification-agent` і project skill. Не переписувати історичні записи `docs/log.md`, старі design docs або implementation plans.

- [x] **Step 4: Перевірити naming gate**

Run:

```bash
find .claude/commands -maxdepth 1 -type f ! -name 'hw6-*' -print
rg -n '/(write-spec|validate-transactions)' README.md docs/research-notes.md .claude/agents .claude/skills/hw6-writing-feature-specifications .claude/commands
```

Expected: `find` і `rg` не повертають unprefixed project command names.

### Task 2: Перевірити coverage gate

**Files:**
- Verify: `.claude/hooks/coverage-gate.sh`
- Verify: `.claude/settings.json`
- Verify: `vitest.config.ts`
- Modify: `docs/log.md`

**Interfaces:**
- Consumes: Claude Code `PreToolUse` JSON із полем `tool_input.command`.
- Produces: exit code `0` для non-push або успішного coverage run; exit code `2` для failed coverage run перед push.

- [x] **Step 1: Перевірити shell syntax і non-push path**

Run:

```bash
sh -n .claude/hooks/coverage-gate.sh
printf '%s' '{"tool_input":{"command":"git status"}}' | CLAUDE_PROJECT_DIR="$PWD" .claude/hooks/coverage-gate.sh
```

Expected: обидві команди завершуються з exit code `0`, coverage не запускається.

- [x] **Step 2: Перевірити configured threshold**

Run:

```bash
rg -n 'lines: 80|functions: 80|branches: 80|statements: 80' vitest.config.ts
```

Expected: знайдено всі чотири thresholds зі значенням `80`.

- [x] **Step 3: Перевірити успішний push simulation**

Run без справжнього push:

```bash
printf '%s' '{"tool_input":{"command":"git push"}}' | CLAUDE_PROJECT_DIR="$PWD" .claude/hooks/coverage-gate.sh
```

Expected: hook запускає `npm run test:coverage`, coverage проходить, hook завершується з exit code `0`.

- [x] **Step 4: Виконати загальну статичну перевірку**

Run:

```bash
npm run typecheck
git diff --check
```

Expected: обидві команди завершуються з exit code `0`.

- [x] **Step 5: Оновити журнал**

Append у `docs/log.md` запис `implement` або `verify` із фактично перейменованими файлами та фактично запущеними командами. Не заявляти про failed-gate simulation або screenshots, яких не виконували.

- [x] **Step 6: Запропонувати commit title без staging**

Suggested title:

```text
chore: complete hw6 skills and coverage gate
```
