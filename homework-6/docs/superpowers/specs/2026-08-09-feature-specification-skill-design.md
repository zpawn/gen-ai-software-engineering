# Skill design for feature specifications

**Date:** 2026-08-09
**Status:** approved by the student, ready for implementation
**Student:** ilia makarov

## 1. Purpose

Create a project-level Claude Code skill that helps `hw6-specification-agent` reproducibly create a separate technical specification for each feature before starting its implementation.

Skill creates documentation, but does not implement application code, tests, or runtime configuration.

## 2. Distribution of responsibilities

```text
/write-spec <feature>
        ↓
hw6-specification-agent
        ↓ uses
hw6-writing-feature-specifications skill
        ↓ fills
specification-template.md
        ↓ creates
docs/specifications/<feature-slug>.md
```

- **Command** `/write-spec` is a user-facing entry point and accepts a feature name.
- **AI meta-agent** `hw6-specification-agent` examines the project context and executes the workflow.
- **Skill** `hw6-writing-feature-specifications` defines the reusable method, required sections, routing and quality gates.
- **Template asset** defines the same structure of all feature specifications.
- **Feature specification** is the result of the workflow and the input for the next design/implementation stage.

## 3. Canonical ways

```text
.claude/
├── skills/
│   └── hw6-writing-feature-specifications/
│       ├── SKILL.md
│       └── assets/
│           └── specification-template.md
├── agents/
│   └── hw6-specification-agent.md
└── commands/
    └── write-spec.md

docs/
├── specification.md
└── specifications/
    └── <feature-slug>.md
```

`docs/specification.md` remains the general specification of the entire banking transaction pipeline. It is not converted to an index and is not replaced by feature specs.

Each separate feature receives a `docs/specifications/<feature-slug>.md` file. Slug contains only lowercase letters, digits and hyphens. Root specification files are not created.

## 4. Template source

Skill necessarily uses a template as a basis:

```text
homework-3/specification-TEMPLATE-example.md
```

So that Homework 6 does not depend on the sibling directory at startup, a local adapted copy is added to the skill:

```text
.claude/skills/hw6-writing-feature-specifications/assets/specification-template.md
```

Bundled asset retains the basic structure of Homework 3:

1. Feature title and instruction block.
2. High-Level Objective.
3. Mid-Level Objectives.
4. Implementation Notes.
5. Beginning Context.
6. Ending Context.
7. Low-Level Tasks.

The generic examples for banking/API/testing from Homework 3 are not copied verbatim into each new specification. Asset contains one universal skeleton and project-specific quality checklist for money, security, audit, PII, tests and verification.

## 5. Workflow skill

1. Read `AGENTS.md`, `README.md`, `docs/specification.md` and the last entries in `docs/log.md`.
2. Get feature title; if there is none, ask the user to name the feature.
3. Build a deterministic feature slug.
4. Check if `docs/specifications/<feature-slug>.md` exists.
5. If the spec exists, update it without losing agreed solutions; if it does not exist, use the bundled template asset.
6. Examine the relevant code/docs context without implementation changes.
7. Specify only those requirements that significantly change the scope or architecture.
8. Fill in all required sections and low-level task contracts.
9. Conduct a self-review on placeholders, ambiguity, contradictions, scope creep and unverifiable objectives.
10. Write the spec in the canonical feature path.
11. Add append-only `docs` entry to `docs/log.md`.
12. Offer a Conventional Commit name without `git add` or `git commit`.

## 6. Feature specification contract

Each `docs/specifications/<feature-slug>.md` file must contain:

- one clear High-Level Objective;
- 3–5 measurable Mid-Level Objectives;
- explicit technical, security, data and quality constraints;
- Beginning Context with actually available files and state;
- Ending Context with exact deliverables and verification commands;
- Low-Level Tasks, each with exact AI prompt, files to create/update, interfaces/functions and implementation details;
- assumptions, marked as assumptions;
- out-of-scope boundary;
- definition of done.

The spec must not contain `TBD`, `TODO`, unfilled bracket placeholders, or statements that the feature is already implemented.

## 7. Changes to existing components

### `hw6-specification-agent.md`

Agent receives a direct request to use `hw6-writing-feature-specifications` for feature specs and bundled template asset as structure. The general `docs/specification.md` remains a separate project-level mode.

### `write-spec.md`

Command takes an argument:

```text
/write-spec <feature-name>
```

If available, the feature name command creates/updates `docs/specifications/<feature-slug>.md`. Project-level `docs/specification.md` is changed only through explicit project mode, not by default.

### `AGENTS.md` and README

Both documents explain:

- general spec: `docs/specification.md`;
- feature specs: `docs/specifications/<feature-slug>.md`;
- feature specs are created through skill;
- skill uses an adapted local copy of the Homework 3 template.

## 8. Skill check

Since this is a new skill, skill-TDD is used:

1. **RED:** give a fresh agent the task of creating a feature spec without skill and fixing structural omissions or path/template drift.
2. **GREEN:** create a minimum skill and repeat the same scenario with the connected skill.
3. **REFACTOR:** close the found gaps and repeat the validation.

Check separately:

- skill directory and YAML frontmatter;
- trigger description;
- bundled template existence;
- output routing for new and existing features;
- lack of root-level feature specs;
- lack of placeholders in the generated spec;
- append-only log behavior;
- no-commit policy.

`SKILL.md` is validated by official `quick_validate.py` from skill-creator package. AI does not perform Git commits and staging.
