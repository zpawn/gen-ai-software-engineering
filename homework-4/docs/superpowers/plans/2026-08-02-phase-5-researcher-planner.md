# Phase 5 Bug Researcher and Bug Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the two read-only Claude Code plugin agents that research a bug
scenario and turn verified research into an implementation plan.

**Architecture:** Both agents live in the plugin root `agents/` directory and
receive only `Read`, `Grep`, and `Glob`. They return contract-shaped Markdown
on stdout; the future orchestrator validates and writes that output to the
selected scenario directory.

**Tech Stack:** Claude Code 2.1.220 plugin subagents, YAML frontmatter,
Markdown, Git.

## Global Constraints

- Work in the current `homework-4-submission` branch as requested.
- Do not commit; the user will review and commit the phase.
- Do not edit installed third-party files under `.claude/skills/`.
- Do not create generated pipeline reports during this phase.
- Use `model: sonnet` and `tools: Read, Grep, Glob` for both agents.
- Do not use `permissionMode`, which Claude Code ignores for plugin agents.
- Keep the assignment-facing `.agent.md` filenames.
- Follow `context/bugs/001-settings-security/artifact-contracts.md` exactly.

---

### Task 1: Implement the Bug Researcher

**Files:**

- Create: `agents/bug-researcher.agent.md`
- Delete: `agents/.gitkeep`

**Interfaces:**

- Consumes: a scenario root, its `bug-context.md`, relevant `src/` files, and
  relevant existing tests.
- Produces: Markdown for `research/codebase-research.md` with the six headings
  defined by the artifact contract.

- [x] **Step 1: Add Claude Code frontmatter**

  Use this exact interface:

  ```yaml
  ---
  name: bug-researcher
  description: Researches a documented bug scenario in the codebase and produces source-backed root-cause analysis before verification or planning.
  tools: Read, Grep, Glob
  model: sonnet
  ---
  ```

- [x] **Step 2: Define preconditions and read-only boundaries**

  Require a repository-relative scenario root and `bug-context.md`. Stop with
  `Status: FAIL` when required input is missing, empty, unreadable, cannot be
  supported by source evidence, or references a source file that cannot be
  read. Never edit files or claim to have written the output artifact.

- [x] **Step 3: Define the research workflow**

  Require the agent to read all of `bug-context.md`, inspect only relevant
  source/tests, assign stable `R-###` claim IDs, distinguish `FACT` from
  `INFERENCE`, cite repository-relative `file:line` references, and use short
  source-matching snippets. Cover every scenario issue and avoid unrelated
  refactoring advice.

- [x] **Step 4: Define the stdout contract**

  Require exactly these headings in this order:

  ```text
  ## Research Summary
  ## Scope Examined
  ## Claims
  ## Root Cause Analysis
  ## Evidence
  ## References
  ```

  `Research Summary` contains `Status: PASS` only when every required issue is
  supported. Every claim contains ID, type, statement, and references; every
  root cause maps to a scenario issue ID.

- [x] **Step 5: Validate the agent definition**

  Run:

  ```bash
  claude plugin validate . --strict
  ```

  Expected: validation succeeds.

  Run a structural check confirming the exact frontmatter values, headings,
  statuses, stable claim IDs, source-reference rules, and absence of write or
  shell tools.

### Task 2: Implement the Bug Planner

**Files:**

- Create: `agents/bug-planner.agent.md`

**Interfaces:**

- Consumes: `bug-context.md`, `research/verified-research.md`, cited source
  files, existing relevant tests, and test scripts from `package.json`.
- Produces: Markdown for `implementation-plan.md` with the six headings defined
  by the artifact contract.

- [x] **Step 1: Add Claude Code frontmatter**

  Use this exact interface:

  ```yaml
  ---
  name: bug-planner
  description: Converts successfully verified codebase research into a source-traceable, file-by-file bug-fix and test plan without modifying the repository.
  tools: Read, Grep, Glob
  model: sonnet
  ---
  ```

- [x] **Step 2: Define the verification gate**

  Require the selected scenario's verified research rather than raw research.
  Stop with `Status: FAIL` unless `## Verification Summary` contains exactly
  `Status: PASS`, every reference resolves to a readable file and valid line
  range, and every requested change traces to a verified claim.

- [x] **Step 3: Define file-by-file planning**

  For every planned file, require issue IDs, verified claim IDs, current
  behavior with source references, intended behavior, exact edit scope,
  acceptance criteria, and at least one stable `T-###` test-case ID proving the
  change. Define those IDs in `Test Plan`, cover every scenario issue, and
  exclude unrelated refactoring.

- [x] **Step 4: Define test and stdout contracts**

  Copy test commands from `package.json`; do not invent commands. Require
  exactly these headings in this order:

  ```text
  ## Plan Summary
  ## Preconditions
  ## Changes by File
  ## Test Plan
  ## Risks and Guardrails
  ## References
  ```

  `Plan Summary` contains `Status: PASS` only when the plan is complete and
  safe for Bug Fixer. Return Markdown only and never claim to have written the
  target file.

- [x] **Step 5: Validate the agent definition**

  Run Claude plugin validation and a structural check for the exact
  frontmatter, verification gate, required headings, traceability fields,
  repository test commands, and read-only tool allowlist.

### Task 3: Mark Phase 5 complete and verify the repository

**Files:**

- Modify: `PHASES.md`

**Interfaces:**

- Consumes: the two validated agent definitions.
- Produces: roadmap status showing Phase 5 complete and Phase 6 next.

- [x] **Step 1: Update progress**

  Mark Phase 5 as `✅ Виконано`, Phase 6 as `⏭️ Наступна`, and add
  `**Статус:** виконано.` to the Phase 5 section.

- [x] **Step 2: Verify no generated reports were created**

  Confirm the scenario still contains only authored inputs and the research
  placeholder.

- [x] **Step 3: Run final verification**

  Run:

  ```bash
  claude plugin validate . --strict
  npm test -- --runInBand
  git diff --check
  git status --short --branch
  ```

  Expected: plugin validation succeeds, all Jest tests pass, whitespace checks
  pass, and only Phase 5 files are uncommitted.

- [x] **Step 4: Prepare handoff without committing**

  Recommend this commit name:

  ```text
  feat(hw4): add research and planning agents
  ```
