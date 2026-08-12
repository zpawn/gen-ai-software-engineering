# The initial foundation of Homework 6 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create project documentation and initial Claude Code infrastructure that clearly separates AI meta-agents from TypeScript pipeline agents.

**Architecture:** `AGENTS.md` will be the only source of operational rules, and `CLAUDE.md`, `CODEX.md` and `GEMINI.md` will only point to it. Explanatory documentation will live in README and `docs/`, and Claude Code will receive four project subagents, three commands and an initial coverage hook without implementing the TypeScript pipeline itself.

**Tech Stack:** Markdown, Claude Code project agents/commands/hooks, Node.js + TypeScript + Fastify as a planned application stack, SQLite + Drizzle ORM only as needed.

## Global Constraints

- Project documentation uses clear B1+ English.
- The student is noted as `ilia makarov`.
- `AI meta-agent` and `TypeScript pipeline agent` are always different.
- Canonical paths: `docs/specification.md`, `docs/research-notes.md`, `docs/log.md`.
- Root duplicates of these three documents are not created.
- `docs/log.md` is a chronological append-only journal with `## [YYYY-MM-DD] <type> | <title>` headers.
- AI does not perform `git commit`; after the verified stage only offers a Conventional Commit name.
- TypeScript pipeline is not implemented within this plan and is not described as ready.
- `shared/` JSON catalogs remain a mandatory future runtime protocol; SQLite does not replace them.

---

### Task 1: README and CLARIFY migration

**Files:**
- Create: `README.md`
- Delete after migration: `CLARIFY.md`
- Reference: `TASKS.md`
- Reference: `docs/superpowers/specs/2026-08-09-project-foundation-design.md`

**Interfaces:**
- Consumes: explanations and Mermaid diagrams from `CLARIFY.md`.
- Produces: The canonical human explanation of the project, which will be referenced by `AGENTS.md`.

- [ ] **Step 1: Fix mandatory README structure**

The README should contain exactly the following content blocks:

```text
1. Name, student, project status
2. The purpose of the project
3. Why are there two different types of agents?
4. Responsibilities of four AI meta-agents
5. Responsibilities of TypeScript pipeline agents
6. General Claude Code workflow (Mermaid)
7. Transaction pipeline sequence (Mermaid)
8. Claude Code + MCP interaction (Mermaid)
9. ASCII pipeline diagram
10. File communication shared/
11. Planned technology stack
12. Canonical documentation
13. Current status
```

- [ ] **Step 2: Write the README in simple B1+ English**

The README should clearly explain:

```text
Claude Code does not process transactions for the application.
AI meta-agents create specification, code, tests and documentation.
TypeScript pipeline agents are deterministic modules without LLM.
Integrator starts pipeline agents sequentially with one npm command.
```

Move and edit the three Mermaid diagrams from `CLARIFY.md`, without claiming that the pipeline is already implemented at this stage.

- [ ] **Step 3: Delete temporary CLARIFY after migration**

Remove `CLARIFY.md` only after all three diagrams and a key explanation of the two agent levels are present in the README.

- [ ] **Step 4: Check the README**

Run:

```bash
rg -n "ilia makarov|AI meta-agent|TypeScript pipeline agent|```mermaid|docs/specification.md|docs/research-notes.md|docs/log.md" README.md
test ! -e CLARIFY.md
```

Expected: name, both levels of agents, three Mermaid blocks and all canonical documentation paths found; `CLARIFY.md` does not exist.

---

### Task 2: Canonical instructions for AI tools

**Files:**
- Create: `AGENTS.md`
- Create: `CLAUDE.md`
- Create: `CODEX.md`
- Create: `GEMINI.md`

**Interfaces:**
- Consumes: design spec rules and README terminology.
- Produces: single project instructions for Claude Code, Codex and Gemini.

- [ ] **Step 1: Create AGENTS.md**

The document must contain:

```text
- mandatory reading order;
- canonical documentation paths;
- two-agent-level terminology;
- B1+ English documentation rule;
- planned TypeScript/Fastify/SQLite/Drizzle stack;
- Context7 requirement for framework documentation;
- file-based shared/ protocol;
- decimal money, ISO 4217, audit logging and PII rules;
- TDD and verification expectations;
- append-only docs/log.md format;
- no-commit policy with commit-message suggestions only.
```

- [ ] **Step 2: Create three wrapper files**

Each wrapper must have a platform-specific title and the same mandatory instruction:

```markdown
Be sure to read `AGENTS.md` before doing any work.
All ground rules, canonical paths, architectural decisions, and workflow are defined there.
```

- [ ] **Step 3: Check wrappers and canonical paths**

Run:

```bash
for file in CLAUDE.md CODEX.md GEMINI.md; do rg -q 'AGENTS.md' "$file"; done
rg -n "docs/specification.md|docs/research-notes.md|docs/log.md|git commit|Context7" AGENTS.md
```

Expected: all wrappers refer to `AGENTS.md`; all canonical paths and git policy found.

---

### Task 3: Canonical specification and research notes

**Files:**
- Create: `docs/specification.md`
- Create: `docs/research-notes.md`
- Reference: `TASKS.md`
- Reference: `sample-transactions.json`

**Interfaces:**
- Consumes: requirements of Homework 6 and agreed technology direction.
- Produces: specification for code-generation agent and log of actually executed Context7 queries.

- [ ] **Step 1: Create a complete specification in docs/**

`docs/specification.md` must have five mandatory sections:

```text
1. High-Level Objective
2. Mid-Level Objectives — 4–5 testable objectives
3. Implementation Notes
4. Context — beginning and ending state
5. Low-Level Tasks — exact prompt, file, function and details per pipeline agent
```

The specification fixes TypeScript strict mode, precise decimal library, ISO 4217, redacted PII logging, JSON message envelope, sequential validator → fraud detector → compliance checker flow, all transactions represented in `shared/results/`, coverage target ≥90%.

- [ ] **Step 2: Create research-notes from the executed Context7 queries**

Record separate sections for:

```text
Fastify: /fastify/fastify
Drizzle ORM: /drizzle-team/drizzle-orm-docs
Claude Code: /websites/code_claude
```

For each section, specify search text, selected library ID, key insight and planned application. It should be noted separately that during implementation, Agent 2 will add at least two code-generation queries, because they are a graded requirement.

- [ ] **Step 3: Check the structure of the specification and notes**

Run:

```bash
rg -n "High-Level Objective|Mid-Level Objectives|Implementation Notes|Context|Low-Level Tasks" docs/specification.md
rg -n "/fastify/fastify|/drizzle-team/drizzle-orm-docs|/websites/code_claude" docs/research-notes.md
test ! -e specification.md
test ! -e research-notes.md
```

Expected: all sections and library IDs are present; there are no root duplicates.

---

### Task 4: Four Claude Code meta-agents

**Files:**
- Create: `.claude/agents/hw6-specification-agent.md`
- Create: `.claude/agents/hw6-code-generation-agent.md`
- Create: `.claude/agents/hw6-unit-test-agent.md`
- Create: `.claude/agents/hw6-documentation-agent.md`

**Interfaces:**
- Consumes: `AGENTS.md`, README and canonical docs paths.
- Produces: Claude Code project subagents with YAML frontmatter `name`, `description`, `tools` and role prompt.

- [ ] **Step 1: Create hw6-specification-agent**

Frontmatter:

```yaml
name: hw6-specification-agent
description: Creates and validates the transaction pipeline specification before implementation.
tools: Read, Grep, Glob, Write, Edit
```

Prompt requires reading `AGENTS.md` and `TASKS.md`, working only with `docs/specification.md`, not writing application code and checking five required sections.

- [ ] **Step 2: Create hw6-code-generation-agent**

Frontmatter:

```yaml
name: hw6-code-generation-agent
description: Implements the TypeScript transaction pipeline according to the agreed specification.
tools: Read, Grep, Glob, Write, Edit, Bash
```

Prompt requires TDD, Context7 research, `docs/research-notes.md` update, sequential file protocol, precise decimals, PII redaction and no git commits.

- [ ] **Step 3: Create hw6-unit-test-agent**

Frontmatter:

```yaml
name: hw6-unit-test-agent
description: Creates unit and integration tests and monitors coverage transaction pipeline.
tools: Read, Grep, Glob, Write, Edit, Bash
```

Prompt requires unit tests for every pipeline agent, isolated integration test, coverage ≥90%, gate ≥80% and fresh verification output.

- [ ] **Step 4: Create hw6-documentation-agent**

Frontmatter:

```yaml
name: hw6-documentation-agent
description: Maintains project documentation and run instructions for Homework 6.
tools: Read, Grep, Glob, Write, Edit
```

Prompt requires factual status, student name, canonical docs paths, no duplication of `AGENTS.md`, and an append-only log.

- [ ] **Step 5: Check agents**

Run:

```bash
for file in .claude/agents/*.md; do rg -q '^name:' "$file"; rg -q '^description:' "$file"; rg -q '^tools:' "$file"; rg -q 'AGENTS.md' "$file"; done
test "$(find .claude/agents -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')" = "4"
```

Expected: exactly four agent definitions with required frontmatter and a reference to `AGENTS.md`.

---

### Task 5: Claude Code commands

**Files:**
- Create: `.claude/commands/write-spec.md`
- Create: `.claude/commands/run-pipeline.md`
- Create: `.claude/commands/validate-transactions.md`

**Interfaces:**
- Consumes: project subagents and future npm scripts.
- Produces: `/write-spec`, `/run-pipeline`, `/validate-transactions` entry points.

- [ ] **Step 1: Create write-spec command**

Frontmatter allows `Read, Grep, Glob, Write, Edit` and describes the command. Prompt tells to use `hw6-specification-agent`, create/update only `docs/specification.md`, check structure and show summary.

- [ ] **Step 2: Create run-pipeline command**

Command must:

```text
1. Read AGENTS.md.
2. Verify sample-transactions.json.
3. Verify package.json and pipeline script; if absent, report that implementation is not ready without inventing success.
4. Clear only known shared subdirectories.
5. Run npm run pipeline.
6. Summarize shared/results and rejected reasons.
7. Never commit changes.
```

- [ ] **Step 3: Create validate-transactions command**

Command should check required input, run future `npm run validate:dry`, show total/valid/invalid counts and a result table, or clearly report that the script is not implemented yet.

- [ ] **Step 4: Check commands**

Run:

```bash
test "$(find .claude/commands -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')" = "3"
rg -n "docs/specification.md" .claude/commands/write-spec.md
rg -n "npm run pipeline|shared/results" .claude/commands/run-pipeline.md
rg -n "validate:dry|valid|invalid" .claude/commands/validate-transactions.md
```

Expected: exactly three commands and all required workflow steps found.

---

### Task 6: Initial coverage hook

**Files:**
- Create: `.claude/hooks/coverage-gate.sh`
- Create: `.claude/settings.json`

**Interfaces:**
- Consumes: Claude Code PreToolUse JSON from stdin; future `npm run test:coverage` script.
- Produces: hook scaffold that checks coverage before Claude-initiated `git push` once the test script exists.

- [ ] **Step 1: Write safe coverage hook**

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

### Task 7: Append-only log and final check

**Files:**
- Create: `docs/log.md`
- Verify: all files created in Tasks 1–6

**Interfaces:**
- Consumes: actual worktree changes and verification output.
- Produces: chronological history and evidence-backed handoff.

- [ ] **Step 1: Create log with chronological entries**

Add entries in this order:

```text
## [2026-08-09] design | The initial structure of Homework 6
## [2026-08-09] research | Context7 documentation for the selected stack
## [2026-08-09] docs | Documentary foundation
## [2026-08-09] implement | Initial Claude Code infrastructure
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
rg -n "ready|implemented|working|completed|production-ready" README.md docs/specification.md .claude/agents .claude/commands
git status --short
```

Expected: any readiness wording refers only to documentation/scaffold, not to the unimplemented TypeScript pipeline.

- [ ] **Step 4: Suggest commit message without committing**

After successful verification, suggest:

```text
docs: establish homework 6 agent architecture
```

Do not run `git add` or `git commit`.
