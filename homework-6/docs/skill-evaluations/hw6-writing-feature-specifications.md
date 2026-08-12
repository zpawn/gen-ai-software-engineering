# Evaluation: hw6-writing-feature-specifications

## RED baseline

**Date:** 2026-08-09
**Condition:** fresh agent received a request to create a separate specification for the recurring-payments feature without access to the new skill or its design.

### Prompt

```text
Quickly prepare a technical specification for a new recurring-payments feature.
We want a separate specification for every feature.

Read only AGENTS.md, README.md, .claude/agents/hw6-specification-agent.md,
and .claude/commands/write-spec.md. Return the exact output path, complete
section outline, workflow steps, and questions you would ask first.
```

### Observed baseline behavior

- Agent chose `docs/specification.md`, that is, the general project spec, instead of a separate feature path.
- Agent himself noticed that `docs/specifications/recurring-payments.md` needed to change the project rules, but did not have a reusable routing contract.
- Outline contained core sections and assumptions, but did not have an explicit out-of-scope section and definition of done.
- Agent did not use the Homework 3 template as a canonical structure source, because the template was not bundled in the workflow.
- Low-Level Tasks were domain-specific, but their exact field contract depended on agent interpretation, not on reusable template.

### RED result

**Result: FAIL**

Baseline confirmed the main problem: an agent without a skill does not have a stable output routing and template contract for individual feature specifications.

## GREEN success criteria

The same scenario with skill should:

1. Select `docs/specifications/recurring-payments.md`.
2. Leave `docs/specification.md` unchanged as a project-level spec.
3. Use the bundled asset adapted from `homework-3/specification-TEMPLATE-example.md`.
4. Include High-Level Objective, 3–5 measurable Mid-Level Objectives, Implementation Notes, Beginning/Ending Context and structured Low-Level Tasks.
5. Add assumptions, out-of-scope boundary and definition of done.
6. Do not leave `TBD`, `TODO` or bracket placeholders.
7. Do not implement feature code.
8. Follow the append-only log and no-commit policy.

## GREEN run

**Date:** 2026-08-09
**Condition:** fresh agent received the same recurring-payments scenario and explicit skill path `.claude/skills/hw6-writing-feature-specifications/SKILL.md`.

### Observed behavior with skill

- Agent chose the exact canonical path `docs/specifications/recurring-payments.md`.
- Agent left the general `docs/specification.md` unchanged.
- Outline corresponded to the bundled template: objectives, implementation subsections, context, assumptions, out of scope, structured low-level tasks and Definition of Done.
- Workflow clearly loaded the bundled template, checked the existing target, set one material clarification and completed the self-review.
- Agent kept no-implementation, append-only log and no-commit boundaries.

### GREEN result

**Result: PASS**

All eight GREEN success criteria are fulfilled. Routing failure with RED baseline fixed skill contract.

## Artifact-producing RED/GREEN run

To check not only the agent response, but also the actual file operations, the same scenario is repeated in two isolated fixtures inside the workspace. Both fresh agents were instructed to actually change files, not to implement application code, and not to use git.

### RED artifact

- Fixture contained the old `AGENTS.md`, `/write-spec` and `hw6-specification-agent`, but did not contain the new skill or feature-spec design.
- Initial SHA-256 `docs/specification.md`: `8f7afbb9c415db7520107174f72aafe0735a2fe65bf063dfae38eb29666b177e`.
- Fresh agent changed exactly `docs/specification.md`; final SHA-256: `b063b1acc53954d9cc6718912ddba31752a5c20a1cf680de6abb565b060800a2`.
- `docs/specifications/recurring-payments.md` was not created.
- The number of machine-readable log headings increased from 9 to 10; previous entries are not overwritten.

**Artifact result: FAIL.** The old workflow turned a feature request into a change to the overall project specification.

### GREEN artifact

- Fixture contained integrated `hw6-writing-feature-specifications` skill and bundled template.
- Fresh agent created `docs/specifications/recurring-payments.md` and added records to the end of `docs/log.md`.
- SHA-256 `docs/specification.md` before and after run remained `8f7afbb9c415db7520107174f72aafe0735a2fe65bf063dfae38eb29666b177e`.
- The number of machine-readable log headings increased from 12 to 14; log diff only contained appended entries.
- Generated spec contained all required sections, 4 structured Low-Level Tasks and 6 explicit `[ASSUMPTION]` markers; `TBD`, `TODO`, `{{...}}` and empty placeholders were not found.
- Agent reported `FINAL_ARTIFACT_CHECK_OK`; application code and git state did not change.

**Artifact result: PASS.** Real artifacts confirmed routing, template contract, saving project spec and append-only log behavior.

Temporary fixtures after fixing the results are deleted; recurring-payments spec is not part of Homework 6 deliverables.

## Validator reproducibility

Official `quick_validate.py` requires `PyYAML`, which is not available in the Python system of this environment. The test is performed in an isolated temporary venv:

```bash
python3 -m venv /tmp/hw6-skill-validate-venv
/tmp/hw6-skill-validate-venv/bin/pip install PyYAML
/tmp/hw6-skill-validate-venv/bin/python \
  /Users/illia.mak/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .claude/skills/hw6-writing-feature-specifications
```

Actual result: `Skill is valid!` (`PyYAML 6.0.3`). Temporary venv is not included in the repository.

## Refactor

An additional refactor was not necessary after the GREEN run: the agent correctly applied the output path, complete template outline and workflow boundaries from the first check.