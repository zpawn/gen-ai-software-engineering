---
name: unit-tests-first
description: Use when designing, generating, or reviewing unit tests for changed behavior, especially when tests risk external dependencies, shared state, nondeterminism, weak assertions, or unrelated coverage.
---

# Unit Tests FIRST

## Overview

Use FIRST to keep unit tests fast, isolated, deterministic, automatically
decisive, and coupled to the behavior change they protect.

## Scope the Tests

Read the fix summary, production changed-file list, Git diff, existing relevant
tests, and project test configuration. Generate tests only for behavior changed
by that production diff. Follow the existing framework and naming style.

For every proposed test, identify the changed behavior and the regression that
would make its assertion fail. Omit unrelated coverage and production edits.

## FIRST Rules

| Principle | `PASS` rule |
| --- | --- |
| **Fast** | Exercise the unit directly. Replace real network, database, filesystem, timers, subprocesses, Jira, Google, and AI provider calls with controlled test doubles. |
| **Independent** | The result is unchanged by test order or parallel execution. Create fresh state per test and restore mocks, spies, environment variables, and timers. |
| **Repeatable** | The same inputs always produce the same result. Control time, randomness, IDs, locale, environment, and external responses. |
| **Self-validating** | Use explicit assertions against observable behavior. Console output, manual inspection, or a command exiting successfully is not a test oracle. |
| **Timely** | Map the test to a behavior in the current fix summary and changed diff. It accompanies that change and would fail if the fixed behavior regressed. |

A principle is `FAIL` when its rule cannot be demonstrated. Do not grant a
pass based on intention.

## Test Workflow

1. Map each changed behavior to at least one focused test case.
2. Reuse the project test setup; mock only boundaries outside the unit.
3. Arrange controlled inputs, act once, and assert observable outcomes.
4. Run the narrow generated-test command, then the existing unit suite.
5. Record exact commands, exit codes, suite counts, test counts, and gaps.

In a post-fix generation pipeline, satisfy `Timely` by using the production diff
to show that each test protects the current change. Do not rewrite production
code merely to manufacture a test-first sequence.

## Required Assessment Shape

```markdown
## FIRST Assessment

- Fast: PASS | FAIL — <evidence>
- Independent: PASS | FAIL — <evidence>
- Repeatable: PASS | FAIL — <evidence>
- Self-validating: PASS | FAIL — <evidence>
- Timely: PASS | FAIL — <changed behavior protected>
- Overall FIRST: PASS | FAIL
```

Set `Overall FIRST: PASS` only when all five principles pass. A failing test
command makes the test report fail even if the test design satisfies FIRST.

## Common Mistakes

- Calling a local HTTP server and labeling the result a unit test.
- Sharing mutable mocks or environment variables across tests.
- Reading the real clock or random source without control.
- Logging results instead of asserting them.
- Adding broad coverage unrelated to the current production diff.
- Claiming `Timely` without linking the test to changed behavior.
