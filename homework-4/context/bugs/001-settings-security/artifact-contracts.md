# Artifact Contracts: Settings Security Scenario

This document is the source of truth for data passed between the six Claude
Code pipeline stages for scenario `001-settings-security`.

## Global Conventions

- **Repository root:** the directory containing `package.json` and
  `.claude-plugin/plugin.json`.
- **Scenario root:** `context/bugs/001-settings-security`.
- **Paths in reports:** repository-relative POSIX paths.
- **Source references:** `path:line` or `path:start-end`, using line numbers
  from the source version read by the stage.
- **Stage status:** exactly `PASS` or `FAIL`.
- **Severity values:** exactly `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, or `INFO`.
- **Research quality values:** exactly `EXCELLENT`, `GOOD`,
  `NEEDS_REVISION`, or `FAILED`, as defined by the research-quality skill.
- **Sensitive data:** reports, prompts, logs, screenshots, and tests use clear
  placeholders such as `test-jira-api-key`; real credentials are forbidden.
- **Report delivery:** report-only agents return Markdown on stdout. The
  orchestrator writes that output to the exact contracted path only after the
  Claude Code process exits successfully.
- **Production code:** files under `src/`.
- **Test code:** Jest files matching the repository's configured test layout,
  including `src/**/*.spec.ts` and `test/**/*.ts`.

## Generated Artifacts

| Artifact | Producer | Consumer | Commit after final run |
| --- | --- | --- | --- |
| `research/codebase-research.md` | Bug Researcher | Research Verifier | Yes |
| `research/verified-research.md` | Research Verifier | Bug Planner | Yes |
| `implementation-plan.md` | Bug Planner | Bug Fixer | Yes |
| `fix-summary.md` | Bug Fixer | Security Verifier, Unit Test Generator | Yes |
| `security-report.md` | Security Verifier | Reviewer | Yes |
| `test-report.md` | Unit Test Generator | Reviewer | Yes |

`bug-context.md` and this contract are authored inputs, not generated outputs.
`research/.gitkeep` is removed when the first real research artifact is added.

## Stage Contracts

### 1. Bug Researcher

**Claude Code agent:** `homework-4-agent-pipeline:bug-researcher`

**Inputs**

- `context/bugs/001-settings-security/bug-context.md`
- Relevant files under `src/`
- Existing relevant tests under `src/` and `test/`

**Output**

- `context/bugs/001-settings-security/research/codebase-research.md`

**Required headings**

```text
## Research Summary
## Scope Examined
## Claims
## Root Cause Analysis
## Evidence
## References
```

Every claim must include a stable claim ID and at least one source reference.
Every snippet must be short enough to verify directly against the cited source.

**Allowed mutations**

- None. The agent receives read/search tools only.
- The orchestrator creates the output file from the agent's stdout.

**Success conditions**

- All three scenario issues are addressed.
- Claims distinguish observed facts from inferences.
- Every source path exists and every cited line is in range.

**Stop conditions**

- `bug-context.md` is missing or empty.
- A referenced source file cannot be read.
- The agent cannot support a scenario claim with evidence.

### 2. Bug Research Verifier

**Claude Code agent:** `homework-4-agent-pipeline:research-verifier`

**Preloaded skill:** `research-quality-measurement`

**Inputs**

- `context/bugs/001-settings-security/bug-context.md`
- `context/bugs/001-settings-security/research/codebase-research.md`
- Every source file cited by the research

**Output**

- `context/bugs/001-settings-security/research/verified-research.md`

**Required headings**

```text
## Verification Summary
## Verified Claims
## Discrepancies Found
## Research Quality Assessment
## References
```

`Verification Summary` must contain `Status: PASS` or `Status: FAIL`.
`Research Quality Assessment` must contain one quality value defined by the
preloaded skill and reasoning tied to its rubric.

**Allowed mutations**

- None. The agent receives read/search tools only.
- The orchestrator creates the output file from the agent's stdout.

**Success conditions**

- Every claim, path, line range, and snippet has been checked against source.
- Every discrepancy states its impact and required correction.
- `PASS` is used only when no critical discrepancy remains.

**Stop conditions**

- Research input is missing or empty.
- A cited file does not exist.
- Any critical claim is false, unsupported, or materially misquoted; the stage
  writes a `FAIL` report and the pipeline stops before planning.

### 3. Bug Planner

**Claude Code agent:** `homework-4-agent-pipeline:bug-planner`

**Inputs**

- `context/bugs/001-settings-security/bug-context.md`
- `context/bugs/001-settings-security/research/verified-research.md`
- Source files referenced by verified claims
- Relevant project test commands from `package.json`

**Output**

- `context/bugs/001-settings-security/implementation-plan.md`

**Required headings**

```text
## Plan Summary
## Preconditions
## Changes by File
## Test Plan
## Risks and Guardrails
## References
```

Each file entry must describe current behavior, intended behavior, exact edit
scope, and the test that proves the change.

**Allowed mutations**

- None. The agent receives read/search tools only.
- The orchestrator creates the output file from the agent's stdout.

**Success conditions**

- The plan covers BUG-001, BUG-002, and SEC-001.
- Every planned production change traces to a verified claim.
- Test commands are copied from the repository rather than invented.

**Stop conditions**

- Verified research does not contain `Status: PASS`.
- A planned change lacks evidence or acceptance criteria.
- The plan includes unrelated refactoring.

### 4. Bug Fixer

**Claude Code agent:** `homework-4-agent-pipeline:bug-fixer`

**Inputs**

- `context/bugs/001-settings-security/implementation-plan.md`
- Files explicitly listed under `Changes by File`
- Relevant existing tests and project test commands

**Outputs**

- Plan-approved production changes under `src/`
- `context/bugs/001-settings-security/fix-summary.md`

**Required report headings**

```text
## Changes Made
## Test Results
## Overall Status
## Manual Verification
## References
```

Each change entry must include file, location, before behavior, after behavior,
and its test result. `Overall Status` must contain `Status: PASS` or
`Status: FAIL`.

**Allowed mutations**

- Production files explicitly named in the implementation plan.
- No tests, agent definitions, skills, pipeline commands, or unrelated source.
- The orchestrator creates `fix-summary.md` from the agent's stdout after
  checking the production diff.

**Success conditions**

- Changes match the implementation plan.
- Relevant tests run after each logical fix and pass.
- The final fix summary matches the actual Git diff.

**Stop conditions**

- The implementation plan is missing or incomplete.
- A required edit falls outside the approved file list.
- Any relevant test fails; the stage returns a `FAIL` summary and makes no
  further changes.

### 5. Security Verifier

**Claude Code agent:** `homework-4-agent-pipeline:security-verifier`

**Inputs**

- `context/bugs/001-settings-security/fix-summary.md`
- The pipeline baseline Git SHA supplied by the orchestrator
- The explicit production changed-file list supplied by the orchestrator
- The content and Git diff of every listed file
- Relevant dependency manifests when dependency risk applies

**Output**

- `context/bugs/001-settings-security/security-report.md`

**Required headings**

```text
## Security Summary
## Review Scope
## Findings
## Checklist Coverage
## Overall Status
## References
```

Each finding must contain an ID, severity, `file:line`, impact, evidence, and
remediation. `Checklist Coverage` must explicitly address injection, hardcoded
secrets, insecure comparisons, validation, unsafe dependencies, XSS, and CSRF,
marking non-applicable categories with reasoning.

**Allowed mutations**

- None. The agent receives read/search tools only.
- The orchestrator creates the output file from the agent's stdout.

**Success conditions**

- Every changed production file is reviewed.
- SEC-001 is confirmed fixed without a replacement credential leak.
- `Overall Status` contains `Status: PASS` only when no unresolved `CRITICAL`
  or `HIGH` finding remains.

**Stop conditions**

- `fix-summary.md` is missing or reports `Status: FAIL`.
- Changed-file input is empty, contains a missing file, or includes paths
  outside the allowed source scope.
- An unresolved `CRITICAL` or `HIGH` finding produces `Status: FAIL`; the
  verifier still returns the report for the orchestrator to write but never
  edits code.

### 6. Unit Test Generator

**Claude Code agent:** `homework-4-agent-pipeline:unit-test-generator`

**Preloaded skill:** `unit-tests-first`

**Inputs**

- `context/bugs/001-settings-security/fix-summary.md`
- The pipeline baseline Git SHA supplied by the orchestrator
- The explicit production changed-file list supplied by the orchestrator
- Changed production files and their Git diffs
- Existing relevant Jest tests and configuration in `package.json`

**Outputs**

- New or updated Jest tests for changed behavior only
- `context/bugs/001-settings-security/test-report.md`

**Required report headings**

```text
## Test Summary
## Changed Code Covered
## Tests Generated
## FIRST Assessment
## Test Results
## Coverage Gaps
## References
```

`FIRST Assessment` must assess Fast, Independent, Repeatable, Self-validating,
and Timely separately. `Test Results` must include the exact command, exit
status, and suite/test counts.

**Allowed mutations**

- Relevant `src/**/*.spec.ts` or `test/**/*.ts` files only.
- No production source, agent definitions, skills, or pipeline commands.
- The orchestrator creates `test-report.md` from the agent's stdout after
  checking the test-only diff.

**Success conditions**

- Tests cover only the changed behavior described in `fix-summary.md`.
- External repositories, databases, Google, Jira, and AI providers are mocked.
- Generated tests and the existing unit suite pass.

**Stop conditions**

- `fix-summary.md` is missing or reports `Status: FAIL`.
- Changed-file input is empty or invalid.
- Generated or existing tests fail; the report records `Status: FAIL` and the
  pipeline stops.

## Changed Files Contract

Before Bug Researcher starts, the orchestrator requires a clean working tree
and stores:

```bash
git rev-parse HEAD
```

After Bug Fixer, it builds the production changed-file list from both tracked
and untracked paths:

```bash
git diff --name-only <baseline-sha> -- src test
git ls-files --others --exclude-standard -- src test
```

The orchestrator normalizes, de-duplicates, sorts, and validates the combined
list. For this scenario, the list passed to Security Verifier and Unit Test
Generator must:

- contain at least one existing production file under `src/settings/`;
- contain no path outside `src/` or `test/`;
- contain no generated report, plugin component, or installed skill;
- match the production changes summarized in `fix-summary.md`.

The baseline SHA and the exact normalized file list are inserted into both
downstream stage prompts. The list is not inferred again by either agent.

## Validation Rules

The orchestrator validates every stage before starting the next one:

1. Every required input exists, is a regular file, and is non-empty.
2. Claude Code exits with code `0`; otherwise the stage fails.
3. Captured Markdown is non-empty and contains every required heading exactly.
4. The report contains an allowed status and, where applicable, quality or
   severity values.
5. Every referenced repository path exists.
6. Every cited line or range is within the current file length.
7. Every code snippet matches the cited source after whitespace normalization.
8. Git diff contains only mutations allowed by that stage.
9. No output contains obvious credential formats or values from `.env`.

Validation failure prevents the next stage from starting and prints the
terminal marker `[pipeline] Resolve Issue FAIL`. Native Claude Code slash
commands do not control the operating-system exit code of a successful
`claude --print` response, so callers must evaluate this marker rather than
the CLI process exit code.

## Failure Rules

- The first failed stage stops sequential execution.
- A stage that can produce a meaningful failure report does so before exit.
- Research verification `FAIL` prevents Bug Planner from running.
- Bug Fixer `FAIL` prevents Security Verifier and Unit Test Generator from
  running.
- Security Verifier `FAIL` prevents Unit Test Generator from running because
  unresolved high-impact security issues take precedence over test generation.
- Unit Test Generator `FAIL` leaves its test changes visible for diagnosis but
  the overall pipeline fails.
- The orchestrator never hides stderr or replaces a failed report with a
  successful placeholder.

## Idempotency Rules

- The pipeline starts only from a clean working tree and records the starting
  commit as its baseline.
- On rerun, the orchestrator may overwrite only these known generated reports:
  `codebase-research.md`, `verified-research.md`, `implementation-plan.md`,
  `fix-summary.md`, `security-report.md`, and `test-report.md` within the
  selected scenario root.
- `bug-context.md` and `artifact-contracts.md` are immutable pipeline inputs.
- The pipeline never deletes, resets, stages, commits, or stashes user changes.
- Existing generated tests are edited only when they cover currently changed
  behavior and are explicitly included in the Unit Test Generator prompt.
- A clean rerun on already-fixed code that produces no production diff stops
  with a clear `no changed production files` result rather than fabricating
  changes or reports.
