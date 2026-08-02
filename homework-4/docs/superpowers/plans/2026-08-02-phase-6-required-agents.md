# Phase 6 Required Agents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the four required Claude Code plugin agents that verify research,
apply a verified plan, review changed code for security, and generate focused
unit tests.

**Architecture:** All agents follow the existing artifact contracts and return
their report as Markdown on stdout. Verifiers are read-only; Bug Fixer may edit
existing plan-approved production files and run tests; Unit Test Generator may
create or edit only relevant Jest test files and run tests. The future
orchestrator validates every output and Git diff before advancing.

**Tech Stack:** Claude Code 2.1.220 plugin agents, Claude `opus` and `sonnet`
model aliases, Markdown/YAML frontmatter, NestJS 11, Jest 29, TypeScript 5.7.

## Global Constraints

- Work in the current `homework-4-submission` branch as requested.
- Do not commit; the user will review and commit the phase.
- Do not create generated pipeline reports during this phase.
- Do not edit installed third-party files under `.claude/skills/`.
- Do not use `permissionMode`, `hooks`, or `mcpServers` in plugin agents.
- Report-only output is returned on stdout; the orchestrator writes reports.
- Never expose real credentials; use `test-jira-api-key` or similar values.
- Follow `context/bugs/001-settings-security/artifact-contracts.md` exactly.

---

### Task 1: Implement Research Verifier

**Files:**

- Create: `agents/research-verifier.agent.md`

**Interfaces:**

- Consumes: scenario `bug-context.md`, `research/codebase-research.md`, and
  every cited source file.
- Produces: Markdown for `research/verified-research.md`.

- [x] **Step 1: Add frontmatter**

  ```yaml
  ---
  name: research-verifier
  description: Fact-checks codebase research against current source and grades its quality before implementation planning.
  tools: Read, Grep, Glob
  model: opus
  skills:
    - research-quality-measurement
  ---
  ```

- [x] **Step 2: Define verification behavior**

  Require full input reads; verify every claim ID, path, line range, snippet,
  fact/inference classification, and scenario-issue coverage. Apply the
  preloaded skill without inventing other quality labels. Treat missing input,
  unreadable references, false key claims, and material misquotes as critical.

- [x] **Step 3: Define output and failure contracts**

  Return exactly these level-two headings:

  ```text
  ## Verification Summary
  ## Verified Claims
  ## Discrepancies Found
  ## Research Quality Assessment
  ## References
  ```

  Every discrepancy includes claim ID, severity, reference, impact, and
  correction. `PASS` is allowed only for `EXCELLENT` or `GOOD` with zero
  critical discrepancies. Never edit files.

- [x] **Step 4: Validate Research Verifier**

  Validate plugin/frontmatter, skill existence and preload, read-only tools,
  exact headings, allowed labels, and failure rules.

### Task 2: Implement Bug Fixer

**Files:**

- Create: `agents/bug-fixer.agent.md`

**Interfaces:**

- Consumes: scenario `implementation-plan.md`, its exact production file list,
  relevant existing tests, and repository test scripts.
- Produces: plan-approved production edits and Markdown for `fix-summary.md`.

- [x] **Step 1: Add frontmatter**

  ```yaml
  ---
  name: bug-fixer
  description: Applies a verified implementation plan through scoped production edits and reports test-backed results without changing unrelated files.
  tools: Read, Grep, Glob, Edit, Bash
  model: sonnet
  ---
  ```

- [x] **Step 2: Define preflight and mutation boundary**

  Require a complete plan with `Status: PASS`. Extract an exact production
  allowlist from `Changes by File`; reject missing, non-`src/`, test, plugin,
  skill, script, or unplanned paths. Never use Bash to write files. Do not edit
  tests or reports.

- [x] **Step 3: Define execution and test behavior**

  Apply one logical plan step at a time with `Edit`, run the exact relevant
  repository test command after each step, and stop further changes on the
  first failure. Do not silently expand scope, revert with destructive Git
  commands, or claim tests that were not run.

- [x] **Step 4: Define output contract**

  Return exactly these level-two headings:

  ```text
  ## Changes Made
  ## Test Results
  ## Overall Status
  ## Manual Verification
  ## References
  ```

  Each change includes file/location, before behavior, after behavior, plan
  issue/claim/test IDs, and actual test result. Report exact commands, exit
  status, and counts. Return `FAIL` on any preflight or test failure.

- [x] **Step 5: Validate Bug Fixer**

  Validate plugin/frontmatter, tools, production allowlist, Bash write ban,
  test/report mutation ban, exact headings, and stop conditions.

### Task 3: Implement Security Verifier

**Files:**

- Create: `agents/security-verifier.agent.md`

**Interfaces:**

- Consumes: `fix-summary.md`, baseline SHA, explicit changed-production-file
  list, supplied Git diffs, current file contents, and relevant manifests.
- Produces: Markdown for `security-report.md` only.

- [x] **Step 1: Add frontmatter**

  ```yaml
  ---
  name: security-verifier
  description: Reviews an explicit production diff for security regressions and unresolved vulnerabilities after a planned bug fix.
  tools: Read, Grep, Glob
  model: opus
  ---
  ```

- [x] **Step 2: Define input validation and scope**

  Require `fix-summary.md` with `Status: PASS`, a baseline SHA, and a non-empty
  normalized changed-file list containing existing production files only. Read
  every listed file and supplied diff; do not infer or broaden the file list.

- [x] **Step 3: Define security review rubric**

  Address injection, hardcoded secrets, insecure comparisons, validation,
  unsafe dependencies, XSS, and CSRF explicitly, with reasoned `N/A` where
  appropriate. Each finding gets `SEC-F-###`, allowed severity, `file:line`,
  impact, evidence, and remediation. Confirm the original scenario security
  issue is fixed without a replacement leak.

- [x] **Step 4: Define output contract**

  Return exactly these level-two headings:

  ```text
  ## Security Summary
  ## Review Scope
  ## Findings
  ## Checklist Coverage
  ## Overall Status
  ## References
  ```

  `Status: FAIL` when an unresolved `CRITICAL` or `HIGH` finding remains;
  otherwise `PASS`. Never edit production code, tests, or reports.

- [x] **Step 5: Validate Security Verifier**

  Validate plugin/frontmatter, read-only tools, explicit changed-file rules,
  all security categories, severity labels, exact headings, and failure rules.

### Task 4: Implement Unit Test Generator

**Files:**

- Create: `agents/unit-test-generator.agent.md`

**Interfaces:**

- Consumes: `fix-summary.md`, baseline SHA, explicit changed-production-file
  list and diffs, current production files, relevant existing Jest tests, and
  `package.json` Jest configuration.
- Produces: focused Jest tests plus Markdown for `test-report.md`.

- [x] **Step 1: Add frontmatter**

  ```yaml
  ---
  name: unit-test-generator
  description: Generates and runs FIRST-compliant Jest unit tests for production behavior changed by a verified bug fix.
  tools: Read, Grep, Glob, Edit, Write, Bash
  model: sonnet
  skills:
    - unit-tests-first
  ---
  ```

- [x] **Step 2: Define preflight and mutation boundary**

  Require `fix-summary.md` with `Status: PASS`, baseline SHA, and a valid
  changed-production-file list. Build an exact test-file allowlist from changed
  behavior and existing Jest layout. Permit only `src/**/*.spec.ts` and
  `test/**/*.ts`; never edit production, reports, agents, skills, or commands.
  Never use Bash to write files.

- [x] **Step 3: Define test generation and execution**

  Map tests to changed behavior and plan `T-###` IDs, follow existing
  Jest/NestJS conventions, use `Test.createTestingModule` where a Nest unit
  requires DI, and mock PostgreSQL, TypeORM repositories, Jira, Google, AI,
  network, time, randomness, and environment boundaries as relevant. Run the
  narrow generated tests and then the full unit suite using repository scripts.

- [x] **Step 4: Define output contract**

  Return exactly these level-two headings:

  ```text
  ## Test Summary
  ## Changed Code Covered
  ## Tests Generated
  ## FIRST Assessment
  ## Test Results
  ## Coverage Gaps
  ## References
  ```

  Assess each FIRST principle with evidence. Include exact commands, exit
  status, suite/test counts, generated test paths, production references, and
  gaps. Any generated or existing test failure produces `Status: FAIL` and
  stops further mutations.

- [x] **Step 5: Validate Unit Test Generator**

  Validate plugin/frontmatter, skill preload, test-only mutation rules, Bash
  write ban, mocked boundaries, exact headings, FIRST fields, and stop rules.

### Task 5: Complete and verify Phase 6

**Files:**

- Modify: `PHASES.md`

**Interfaces:**

- Consumes: four validated agent definitions.
- Produces: roadmap status showing Phase 6 complete and Phase 7 next.

- [x] **Step 1: Update progress**

  Mark Phase 6 as `✅ Виконано`, Phase 7 as `⏭️ Наступна`, and add
  `**Статус:** виконано.` to the Phase 6 section.

- [x] **Step 2: Review all six agents together**

  Verify handoffs, unique names, models, tools, skill preloads, output headings,
  mutation boundaries, and stop conditions against the artifact contract.

- [x] **Step 3: Run final verification**

  ```bash
  claude plugin validate . --strict
  npm test -- --runInBand
  git diff --check
  git status --short --branch
  ```

  Confirm no generated report exists and no installed third-party skill changed.

- [x] **Step 4: Prepare handoff without committing**

  Recommend:

  ```text
  feat(hw4): add required pipeline agents
  ```
