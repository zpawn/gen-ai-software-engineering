# Phase 3 Claude Code Plugin Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the local Claude Code plugin boundary and document exact artifact handoff contracts for all six pipeline stages without creating fake generated reports.

**Architecture:** The repository root is loaded as the local plugin `homework-4-agent-pipeline` through `claude --plugin-dir .`. Homework components live in `.claude-plugin/`, `agents/`, `skills/`, `commands/`, and `context/`; installed third-party skills remain isolated in `.claude/skills/`.

**Tech Stack:** Claude Code 2.1.220, Claude Code plugin manifest JSON, Markdown contracts, Git.

## Global Constraints

- Do not edit or move installed files under `.claude/skills/`.
- Do not create agent prompts or required skill content during Phase 3.
- Do not create `codebase-research.md`, `verified-research.md`, `implementation-plan.md`, `fix-summary.md`, `security-report.md`, or `test-report.md`; those are pipeline-generated artifacts.
- Preserve the assignment-facing `.agent.md` filenames when agents are implemented later.
- Use native Claude Code skill paths: `skills/<skill-name>/SKILL.md`.
- Do not commit. The user will review and commit the verified changes.

---

### Task 1: Scaffold the local Claude Code plugin boundary

**Files:**

- Create: `.claude-plugin/plugin.json`
- Create: `agents/.gitkeep`
- Create: `skills/.gitkeep`
- Create: `commands/.gitkeep`
- Create: `docs/screenshots/.gitkeep`
- Create: `context/bugs/001-settings-security/research/.gitkeep`

**Interfaces:**

- Consumes: the approved layout in `docs/superpowers/specs/2026-08-02-claude-code-plugin-layout-design.md`.
- Produces: a valid plugin named `homework-4-agent-pipeline` and tracked directories for future agents, skills, orchestration, screenshots, and research.

- [ ] **Step 1: Create the minimal manifest**

  Write `.claude-plugin/plugin.json` exactly as:

  ```json
  {
    "$schema": "https://json.schemastore.org/claude-code-plugin-manifest.json",
    "name": "homework-4-agent-pipeline",
    "displayName": "Homework 4 Agent Pipeline",
    "version": "1.0.0",
    "description": "Six-stage bug research, fix, security, and test pipeline",
    "author": {
      "name": "illia makarov"
    }
  }
  ```

- [ ] **Step 2: Track future component directories**

  Create the five empty `.gitkeep` files listed above. Do not place homework files under `.claude/skills/`.

- [ ] **Step 3: Validate the plugin manifest**

  Run:

  ```bash
  claude plugin validate . --strict
  ```

  Expected: plugin validation succeeds with no errors or warnings.

- [ ] **Step 4: Verify the ownership boundary**

  Run:

  ```bash
  find .claude-plugin agents skills commands docs/screenshots context/bugs/001-settings-security/research -maxdepth 2 -type f -print | sort
  ```

  Expected: the manifest and `.gitkeep` files exist; `.claude/skills/` is absent from the output.

### Task 2: Define all artifact handoff contracts

**Files:**

- Create: `context/bugs/001-settings-security/artifact-contracts.md`

**Interfaces:**

- Consumes: `TASKS.md`, `context/bugs/001-settings-security/bug-context.md`, and the approved Claude Code plugin layout.
- Produces: the single source of truth used by future agent prompts and `commands/resolve-issue.md` for paths, headings, mutation permissions, validation, failure behavior, and idempotency.

- [ ] **Step 1: Document global conventions**

  Define the scenario root as `context/bugs/001-settings-security`, source references as repository-relative `path:line`, status values as `PASS` or `FAIL`, and sensitive test data as placeholders only.

- [ ] **Step 2: Document the six stage contracts**

  For every stage specify exact inputs, outputs, required headings, allowed mutations, success conditions, and stop conditions:

  1. Bug Researcher → `research/codebase-research.md`.
  2. Research Verifier → `research/verified-research.md`.
  3. Bug Planner → `implementation-plan.md`.
  4. Bug Fixer → production changes and `fix-summary.md`.
  5. Security Verifier → `security-report.md` only.
  6. Unit Test Generator → changed-code tests and `test-report.md`.

- [ ] **Step 3: Define the changed-files contract**

  State that the orchestrator captures the baseline Git SHA before the first stage and derives changed code after Bug Fixer with:

  ```bash
  git diff --name-only <baseline-sha> -- src test
  git ls-files --others --exclude-standard -- src test
  ```

  The orchestrator combines, normalizes, de-duplicates, and sorts both outputs.
  Security Verifier and Unit Test Generator receive the resulting explicit file
  list in their prompts. Empty or out-of-scope lists stop the pipeline.

- [ ] **Step 4: Define validation and idempotency**

  Require every output to exist, be non-empty, contain its required headings, and use valid repository-relative references. Define that only known generated artifacts within the selected scenario may be overwritten on rerun; unrelated working-tree changes must stop the pipeline.

- [ ] **Step 5: Verify contract coverage**

  Run:

  ```bash
  rg -n '^## (Global Conventions|Stage Contracts|Changed Files Contract|Validation Rules|Failure Rules|Idempotency Rules|Generated Artifacts)' context/bugs/001-settings-security/artifact-contracts.md
  ```

  Expected: all seven top-level contract sections are present.

### Task 3: Mark Phase 3 complete and verify documentation

**Files:**

- Modify: `PHASES.md`

**Interfaces:**

- Consumes: the validated manifest, tracked directories, and artifact contract.
- Produces: roadmap status showing Phase 3 complete and Phase 4 next.

- [ ] **Step 1: Update the progress table**

  Change Phase 3 to `✅ Виконано` and Phase 4 to `⏭️ Наступна`.

- [ ] **Step 2: Update the Phase 3 status line**

  Change `**Статус:** наступна фаза.` to `**Статус:** виконано.` only in the Phase 3 section.

- [ ] **Step 3: Verify no fake generated reports exist**

  Run:

  ```bash
  find context/bugs/001-settings-security -type f -print | sort
  ```

  Expected: only `bug-context.md`, `artifact-contracts.md`, and `research/.gitkeep` exist in the scenario.

- [ ] **Step 4: Run final static checks**

  Run:

  ```bash
  git diff --check
  claude plugin validate . --strict
  git status --short
  ```

  Expected: no whitespace errors, plugin validation succeeds, and only intended uncommitted files are listed.

- [ ] **Step 5: Prepare the handoff**

  Report files created, validation evidence, and recommend this commit name without committing:

  ```text
  chore(hw4): scaffold Claude Code pipeline contracts
  ```
