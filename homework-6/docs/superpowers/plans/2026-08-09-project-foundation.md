# Початковий фундамент Homework 6 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Створити українськомовну документацію та початкову Claude Code інфраструктуру, яка чітко розділяє AI meta-agents і TypeScript pipeline agents.

**Architecture:** `AGENTS.md` буде єдиним джерелом операційних правил, а `CLAUDE.md`, `CODEX.md` і `GEMINI.md` лише спрямовуватимуть до нього. Пояснювальна документація житиме в README та `docs/`, а Claude Code отримає чотири project subagents, три commands і початковий coverage hook без реалізації самого TypeScript pipeline.

**Tech Stack:** Markdown, Claude Code project agents/commands/hooks, Node.js + TypeScript + Fastify як запланований application stack, SQLite + Drizzle ORM лише за доведеної потреби.

## Global Constraints

- Початкова документація пишеться українською; переклад виконується лише після окремої команди студента.
- Студент зазначається як `ilia makarov`.
- Завжди розрізняються `AI meta-agent` і `TypeScript pipeline agent`.
- Канонічні шляхи: `docs/specification.md`, `docs/research-notes.md`, `docs/log.md`.
- Кореневі дублікати цих трьох документів не створюються.
- `docs/log.md` є chronological append-only журналом із заголовками `## [YYYY-MM-DD] <type> | <title>`.
- AI не виконує `git commit`; після перевіреного етапу лише пропонує Conventional Commit назву.
- TypeScript pipeline не реалізується в межах цього плану й не описується як готовий.
- JSON-каталоги `shared/` залишаються обов’язковим майбутнім runtime protocol; SQLite не замінює їх.

---

### Task 1: README та міграція CLARIFY

**Files:**
- Create: `README.md`
- Delete after migration: `CLARIFY.md`
- Reference: `TASKS.md`
- Reference: `docs/superpowers/specs/2026-08-09-project-foundation-design.md`

**Interfaces:**
- Consumes: пояснення й Mermaid-схеми з `CLARIFY.md`.
- Produces: канонічне людське пояснення проєкту, на яке посилатиметься `AGENTS.md`.

- [ ] **Step 1: Зафіксувати обов’язкову структуру README**

README повинен містити саме такі змістові блоки:

```text
1. Назва, студент, статус проєкту
2. Мета проєкту
3. Чому тут два різні типи агентів
4. Відповідальності чотирьох AI meta-agents
5. Відповідальності TypeScript pipeline agents
6. Загальний Claude Code workflow (Mermaid)
7. Послідовність transaction pipeline (Mermaid)
8. Claude Code + MCP interaction (Mermaid)
9. ASCII pipeline diagram
10. Файлова комунікація shared/
11. Запланований technology stack
12. Канонічна документація
13. Поточний стан
```

- [ ] **Step 2: Написати README простою українською**

README має прямо пояснити:

```text
Claude Code не обробляє транзакції замість застосунку.
AI meta-agents створюють специфікацію, код, тести та документацію.
TypeScript pipeline agents є детермінованими модулями без LLM.
Integrator запускає pipeline agents послідовно однією npm-командою.
```

Перенести й відредагувати три Mermaid-схеми з `CLARIFY.md`, не залишаючи тверджень про вже реалізований pipeline.

- [ ] **Step 3: Видалити тимчасовий CLARIFY після міграції**

Видалити `CLARIFY.md` лише після того, як усі три схеми й ключове пояснення двох рівнів агентів присутні в README.

- [ ] **Step 4: Перевірити README**

Run:

```bash
rg -n "ilia makarov|AI meta-agent|TypeScript pipeline agent|```mermaid|docs/specification.md|docs/research-notes.md|docs/log.md" README.md
test ! -e CLARIFY.md
```

Expected: ім’я, обидва рівні агентів, три Mermaid blocks і всі канонічні документаційні шляхи знайдено; `CLARIFY.md` відсутній.

---

### Task 2: Канонічні інструкції для AI-інструментів

**Files:**
- Create: `AGENTS.md`
- Create: `CLAUDE.md`
- Create: `CODEX.md`
- Create: `GEMINI.md`

**Interfaces:**
- Consumes: правила з design spec і термінологію README.
- Produces: єдині project instructions для Claude Code, Codex і Gemini.

- [ ] **Step 1: Створити AGENTS.md**

Документ повинен містити:

```text
- mandatory reading order;
- canonical documentation paths;
- two-agent-level terminology;
- Ukrainian-first documentation rule;
- planned TypeScript/Fastify/SQLite/Drizzle stack;
- Context7 requirement for framework documentation;
- file-based shared/ protocol;
- decimal money, ISO 4217, audit logging and PII rules;
- TDD and verification expectations;
- append-only docs/log.md format;
- no-commit policy with commit-message suggestions only.
```

- [ ] **Step 2: Створити три wrapper-файли**

Кожен wrapper повинен мати platform-specific title і однакову обов’язкову інструкцію:

```markdown
Перед будь-якою роботою обов’язково прочитайте `AGENTS.md`.
Усі основні правила, канонічні шляхи, архітектурні рішення та процес роботи визначені там.
```

- [ ] **Step 3: Перевірити wrappers і canonical paths**

Run:

```bash
for file in CLAUDE.md CODEX.md GEMINI.md; do rg -q 'AGENTS.md' "$file"; done
rg -n "docs/specification.md|docs/research-notes.md|docs/log.md|git commit|Context7" AGENTS.md
```

Expected: усі wrappers посилаються на `AGENTS.md`; усі канонічні шляхи та git policy знайдено.

---

### Task 3: Канонічна специфікація та research notes

**Files:**
- Create: `docs/specification.md`
- Create: `docs/research-notes.md`
- Reference: `TASKS.md`
- Reference: `sample-transactions.json`

**Interfaces:**
- Consumes: вимоги Homework 6 та погоджений technology direction.
- Produces: специфікацію для code-generation agent і журнал фактично виконаних Context7 queries.

- [ ] **Step 1: Створити повну специфікацію у docs/**

`docs/specification.md` повинен мати п’ять обов’язкових секцій:

```text
1. High-Level Objective
2. Mid-Level Objectives — 4–5 testable objectives
3. Implementation Notes
4. Context — beginning and ending state
5. Low-Level Tasks — exact prompt, file, function and details per pipeline agent
```

Специфікація фіксує TypeScript strict mode, precise decimal library, ISO 4217, redacted PII logging, JSON message envelope, sequential validator → fraud detector → compliance checker flow, all transactions represented in `shared/results/`, coverage target ≥90%.

- [ ] **Step 2: Створити research-notes із виконаних Context7 queries**

Записати окремі секції для:

```text
Fastify: /fastify/fastify
Drizzle ORM: /drizzle-team/drizzle-orm-docs
Claude Code: /websites/code_claude
```

Для кожної секції вказати search text, selected library ID, key insight і planned application. Окремо зазначити, що під час реалізації Agent 2 додасть щонайменше два code-generation queries, бо саме вони є graded requirement.

- [ ] **Step 3: Перевірити структуру специфікації й нотаток**

Run:

```bash
rg -n "High-Level Objective|Mid-Level Objectives|Implementation Notes|Context|Low-Level Tasks" docs/specification.md
rg -n "/fastify/fastify|/drizzle-team/drizzle-orm-docs|/websites/code_claude" docs/research-notes.md
test ! -e specification.md
test ! -e research-notes.md
```

Expected: усі секції та library IDs присутні; кореневих дублікатів немає.

---

### Task 4: Чотири Claude Code meta-agents

**Files:**
- Create: `.claude/agents/specification-agent.md`
- Create: `.claude/agents/code-generation-agent.md`
- Create: `.claude/agents/unit-test-agent.md`
- Create: `.claude/agents/documentation-agent.md`

**Interfaces:**
- Consumes: `AGENTS.md`, README та canonical docs paths.
- Produces: Claude Code project subagents із YAML frontmatter `name`, `description`, `tools` і role prompt.

- [ ] **Step 1: Створити specification-agent**

Frontmatter:

```yaml
name: specification-agent
description: Створює та перевіряє специфікацію transaction pipeline перед реалізацією.
tools: Read, Grep, Glob, Write, Edit
```

Prompt вимагає читати `AGENTS.md` і `TASKS.md`, працювати лише з `docs/specification.md`, не писати application code і перевіряти п’ять required sections.

- [ ] **Step 2: Створити code-generation-agent**

Frontmatter:

```yaml
name: code-generation-agent
description: Реалізує TypeScript transaction pipeline за погодженою специфікацією.
tools: Read, Grep, Glob, Write, Edit, Bash
```

Prompt вимагає TDD, Context7 research, оновлення `docs/research-notes.md`, sequential file protocol, precise decimals, PII redaction і відсутність git commits.

- [ ] **Step 3: Створити unit-test-agent**

Frontmatter:

```yaml
name: unit-test-agent
description: Створює unit та integration тести й контролює coverage transaction pipeline.
tools: Read, Grep, Glob, Write, Edit, Bash
```

Prompt вимагає unit tests for every pipeline agent, isolated integration test, coverage ≥90%, gate ≥80% і fresh verification output.

- [ ] **Step 4: Створити documentation-agent**

Frontmatter:

```yaml
name: documentation-agent
description: Підтримує українську документацію та інструкції запуску Homework 6.
tools: Read, Grep, Glob, Write, Edit
```

Prompt вимагає factual status, student name, canonical docs paths, no duplication of `AGENTS.md`, append-only log і no translation without request.

- [ ] **Step 5: Перевірити agents**

Run:

```bash
for file in .claude/agents/*.md; do rg -q '^name:' "$file"; rg -q '^description:' "$file"; rg -q '^tools:' "$file"; rg -q 'AGENTS.md' "$file"; done
test "$(find .claude/agents -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')" = "4"
```

Expected: рівно чотири agent definitions із required frontmatter і посиланням на `AGENTS.md`.

---

### Task 5: Claude Code commands

**Files:**
- Create: `.claude/commands/write-spec.md`
- Create: `.claude/commands/run-pipeline.md`
- Create: `.claude/commands/validate-transactions.md`

**Interfaces:**
- Consumes: project subagents and future npm scripts.
- Produces: `/write-spec`, `/run-pipeline`, `/validate-transactions` entry points.

- [ ] **Step 1: Створити write-spec command**

Frontmatter дозволяє `Read, Grep, Glob, Write, Edit` і описує command. Prompt наказує використати `specification-agent`, створити/оновити тільки `docs/specification.md`, перевірити структуру та показати summary.

- [ ] **Step 2: Створити run-pipeline command**

Command повинен:

```text
1. Read AGENTS.md.
2. Verify sample-transactions.json.
3. Verify package.json and pipeline script; if absent, report that implementation is not ready without inventing success.
4. Clear only known shared subdirectories.
5. Run npm run pipeline.
6. Summarize shared/results and rejected reasons.
7. Never commit changes.
```

- [ ] **Step 3: Створити validate-transactions command**

Command повинен перевірити required input, run future `npm run validate:dry`, show total/valid/invalid counts and a result table, or clearly report that the script is not implemented yet.

- [ ] **Step 4: Перевірити commands**

Run:

```bash
test "$(find .claude/commands -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')" = "3"
rg -n "docs/specification.md" .claude/commands/write-spec.md
rg -n "npm run pipeline|shared/results" .claude/commands/run-pipeline.md
rg -n "validate:dry|valid|invalid" .claude/commands/validate-transactions.md
```

Expected: рівно три commands і всі required workflow steps знайдено.

---

### Task 6: Початковий coverage hook

**Files:**
- Create: `.claude/hooks/coverage-gate.sh`
- Create: `.claude/settings.json`

**Interfaces:**
- Consumes: Claude Code PreToolUse JSON from stdin; future `npm run test:coverage` script.
- Produces: hook scaffold that checks coverage before Claude-initiated `git push` once the test script exists.

- [ ] **Step 1: Написати safe coverage hook**

Script behavior:

```text
1. Read JSON stdin and extract .tool_input.command using jq when available.
2. Exit 0 when command is not git push.
3. Exit 0 with an informational message while package.json or test:coverage is not configured.
4. Run npm run test:coverage when configured.
5. Exit 2 with stderr explanation when coverage command fails.
6. Exit 0 when coverage command succeeds.
```

The later test configuration must enforce the numeric 80% threshold; this bootstrap hook must not claim the threshold is already operational.

- [ ] **Step 2: Configure PreToolUse hook**

`.claude/settings.json` must use a `PreToolUse` entry with `matcher: "Bash"` and invoke:

```text
"$CLAUDE_PROJECT_DIR"/.claude/hooks/coverage-gate.sh
```

The hook script itself validates the exact command, avoiding accidental execution for unrelated Bash calls.

- [ ] **Step 3: Verify hook syntax and inactive bootstrap behavior**

Run:

```bash
sh -n .claude/hooks/coverage-gate.sh
node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json', 'utf8'))"
printf '%s' '{"tool_input":{"command":"git status"}}' | .claude/hooks/coverage-gate.sh
```

Expected: shell syntax and JSON parse pass; non-push command exits 0.

---

### Task 7: Append-only log та фінальна перевірка

**Files:**
- Create: `docs/log.md`
- Verify: all files created in Tasks 1–6

**Interfaces:**
- Consumes: actual worktree changes and verification output.
- Produces: chronological history and evidence-backed handoff.

- [ ] **Step 1: Create log with chronological entries**

Add entries in this order:

```text
## [2026-08-09] design | Початкова структура Homework 6
## [2026-08-09] research | Context7 документація для обраного стеку
## [2026-08-09] docs | Документаційний фундамент
## [2026-08-09] implement | Початкова Claude Code інфраструктура
```

Each entry includes author/tool, actual files, actual changes and actual verification. Do not report checks that were not run.

- [ ] **Step 2: Run structural verification**

Run:

```bash
test -f README.md
test -f AGENTS.md
test -f docs/specification.md
test -f docs/research-notes.md
test -f docs/log.md
test "$(find .claude/agents -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')" = "4"
test "$(find .claude/commands -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')" = "3"
grep "^## \[" docs/log.md | tail -5
git diff --check
```

Expected: all commands exit 0 and log headings are parseable.

- [ ] **Step 3: Review claims against repository state**

Run:

```bash
rg -n "готовий|реалізовано|працює|completed|production-ready" README.md docs/specification.md .claude/agents .claude/commands
git status --short
```

Expected: any readiness wording refers only to documentation/scaffold, not to the unimplemented TypeScript pipeline.

- [ ] **Step 4: Suggest commit message without committing**

After successful verification, suggest:

```text
docs: establish homework 6 agent architecture
```

Do not run `git add` or `git commit`.
