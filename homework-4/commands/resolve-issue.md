---
description: Resolve a bug scenario through research, fixing, security review, and tests
argument-hint: [scenario-id]
model: opus
---

# Resolve Issue

Run the complete issue-resolution pipeline with Claude Code subagents.
Use the `Task` tool to launch the six plugin agents below. Run them strictly
sequentially, wait for each result, and never simulate an agent in the main
conversation.

## Runtime values

- Treat `$ARGUMENTS` as the scenario ID. If it is empty, use
  `001-settings-security`.
- Accept only a lowercase scenario ID matching
  `^[a-z0-9][a-z0-9-]*$`. Stop on any other value.
- The scenario root is `context/bugs/<scenario-id>`.
- The repository root is the current working directory containing
  `package.json` and `.claude-plugin/plugin.json`.
- Use these exact qualified subagent types in this order:
  1. `homework-4-agent-pipeline:bug-researcher`
  2. `homework-4-agent-pipeline:research-verifier`
  3. `homework-4-agent-pipeline:bug-planner`
  4. `homework-4-agent-pipeline:bug-fixer`
  5. `homework-4-agent-pipeline:security-verifier`
  6. `homework-4-agent-pipeline:unit-test-generator`

The agents preload their own declared skills. Do not copy skill instructions
into their prompts and do not invoke a different agent as a substitute.

## Global safety rules

1. Do not stage, commit, stash, reset, checkout, clean, or roll back files.
2. Never read `.env` files or expose credentials. Use obvious test
   placeholders only.
3. Before launching the first agent, require all of these files to exist and
   be non-empty:
   - `package.json`;
   - `.claude-plugin/plugin.json`;
   - all six files under `agents/` named by the subagent list;
   - `skills/research-quality-measurement/SKILL.md`;
   - `skills/unit-tests-first/SKILL.md`;
   - `<scenario-root>/bug-context.md`;
   - `<scenario-root>/artifact-contracts.md`.
4. Require the current homework project to have no tracked or untracked
   changes. Print the changed paths and stop if it is dirty.
5. Record `git rev-parse HEAD` as the immutable baseline SHA.
6. Immediately before and after every Task call, inspect the Git state. The
   main command writes reports only after this comparison.
7. Researcher, Research Verifier, Planner, and Security Verifier must not
   mutate any file. Bug Fixer may mutate only plan-approved production files.
   Unit Test Generator may mutate only relevant Jest test files for the
   changed production code.
8. On any missing input, malformed output, failed status, unauthorized
   mutation, failed command, or security gate failure: print the failed stage
   and reason, do not launch later agents, and leave the visible diff intact.

## Report handling

Every agent returns Markdown to the parent command. The parent command, not the
subagent, validates and writes it.

For every returned report:

1. Require Markdown only, with the exact level-two headings listed for that
   stage, in the listed order and with no extra level-two headings.
2. Require exactly one `Status: PASS` or `Status: FAIL` in the contracted
   status section.
3. Verify every repository-relative path exists, every `path:line` or
   `path:start-end` reference is in range, and every source-code fence matches
   its immediately preceding reference.
4. Reject absolute paths, parent traversal, credential-shaped values, invented
   commands, and claims unsupported by source.
5. Write the validated Markdown to the exact path using a single trailing
   newline. Do not overwrite any authored input.
6. A valid `FAIL` report may be written for diagnosis, but it stops the
   pipeline immediately.

## Stage 1 — Bug Researcher

Launch `homework-4-agent-pipeline:bug-researcher` with a prompt containing the
scenario root and instructions to read `bug-context.md` completely.

Require these headings:

```text
## Research Summary
## Scope Examined
## Claims
## Root Cause Analysis
## Evidence
## References
```

A passing report must cover `BUG-001`, `BUG-002`, and `SEC-001`. Every
sequential `R-###` claim must include its issue ID, exactly one `FACT` or
`INFERENCE` type, and at least one valid source reference.

Write the report to `<scenario-root>/research/codebase-research.md`. After a
successful write, remove `<scenario-root>/research/.gitkeep` only when it is a
whitespace-only scaffolding file.

Print `[1/6] Bug Researcher PASS` and continue only on `PASS`.

## Stage 2 — Research Verifier

Launch `homework-4-agent-pipeline:research-verifier`. Tell it to verify every
claim, path, line range, and snippet in the research against current source and
to apply its preloaded research-quality skill.

Require these headings:

```text
## Verification Summary
## Verified Claims
## Discrepancies Found
## Research Quality Assessment
## References
```

A passing result requires quality `EXCELLENT` or `GOOD` and zero critical
discrepancies.

Write the report to `<scenario-root>/research/verified-research.md`. Print
`[2/6] Research Verifier PASS (<quality>)` and continue only on `PASS`.

## Stage 3 — Bug Planner

Launch `homework-4-agent-pipeline:bug-planner`. Tell it to use only the
verified research, current source, relevant tests, and the current
`package.json` scripts.

Require these headings:

```text
## Plan Summary
## Preconditions
## Changes by File
## Test Plan
## Risks and Guardrails
## References
```

A passing plan must cover all three scenario issues, cite verified `R-###`
claims, list exact production paths, assign stable `T-###` proof IDs, and use
only test/build commands derived from `package.json`. It must authorize no
test-file mutation for Bug Fixer.

Write the report to `<scenario-root>/implementation-plan.md`. Print
`[3/6] Bug Planner PASS` and continue only on `PASS`.

## Stage 4 — Bug Fixer

Extract the exact production-file allowlist and test commands from the
validated implementation plan. Launch
`homework-4-agent-pipeline:bug-fixer` with the scenario root and remind it that
the plan is the only mutation authority.

Require these headings:

```text
## Changes Made
## Test Results
## Overall Status
## Manual Verification
## References
```

After the Task returns, compare Git state with the pre-stage state. Reject any
mutation outside the production allowlist and reject any test mutation. Every
reported test command must be authorized by the plan and have a real passing
result. The changed production paths in the report must exactly match the
actual production diff.

Write the report to `<scenario-root>/fix-summary.md`. Print
`[4/6] Bug Fixer PASS` and continue only on `PASS` with at least one changed
production file under `src/settings/`.

Build one normalized, sorted, de-duplicated changed-production-file list from
the baseline SHA. Reject test files and paths outside `src/`. Capture the
complete Git diff for exactly those files. Use this same list and diff for both
downstream agents; do not ask them to rediscover the scope.

## Stage 5 — Security Verifier

Launch `homework-4-agent-pipeline:security-verifier` with the scenario root,
baseline SHA, exact changed-production-file list, and complete diff.

Require these headings:

```text
## Security Summary
## Review Scope
## Findings
## Checklist Coverage
## Overall Status
## References
```

Require the report baseline and review scope to exactly match the supplied
handoff. Require separate `PASS`, `FINDING`, or reasoned `N/A` entries for
injection, hardcoded secrets, insecure comparisons, validation, unsafe
dependencies, XSS, and CSRF. Every finding must have one sequential
`SEC-F-###` ID, one allowed severity, a source reference, impact, evidence, and
remediation. `None` is valid only when it is the entire Findings section.

Any unresolved `CRITICAL` or `HIGH` finding forces `FAIL`. Confirm the Task
made no file mutation, write `<scenario-root>/security-report.md`, print
`[5/6] Security Verifier PASS`, and continue only on `PASS`.

## Stage 6 — Unit Test Generator

Derive an exact relevant Jest test-file allowlist from the plan, fix summary,
and changed production paths. Launch
`homework-4-agent-pipeline:unit-test-generator` with the scenario root,
baseline SHA, changed-production-file list, complete diff, and test allowlist.
Tell it to apply its preloaded FIRST skill.

Require these headings:

```text
## Test Summary
## Changed Code Covered
## Tests Generated
## FIRST Assessment
## Test Results
## Coverage Gaps
## References
```

After the Task returns, reject any mutation outside the test allowlist or any
production mutation. A passing report requires all five FIRST principles and
`Overall FIRST: PASS`, an exact `None` Coverage Gaps section, the exact full
command `npm test -- --runInBand`, and a distinct passing narrow test command
whose selector matches an allowlisted test file. Reported generated test paths
must exactly match the actual test diff.

Write `<scenario-root>/test-report.md` and print
`[6/6] Unit Test Generator PASS` only on `PASS`.

## Final verification

After all six stages pass, run these commands sequentially from the repository
root:

```text
npm run build
npm test -- --runInBand
```

Both commands must exit successfully. Preserve their output and finish with:

```text
[final] Build and tests PASS
[pipeline] Resolve Issue PASS
```

On failure, print `[final] Build and tests FAIL: <reason>` followed by
`[pipeline] Resolve Issue FAIL`, and return without claiming success.
