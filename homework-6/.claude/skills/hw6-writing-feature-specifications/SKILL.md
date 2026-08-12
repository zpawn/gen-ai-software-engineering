---
name: hw6-writing-feature-specifications
description: Use when creating or updating a technical specification for one feature before implementation, especially through /hw6-write-spec or hw6-specification-agent.
---

# Writing Feature Specifications

## Overview

Create one implementation-ready specification per feature. Keep the project-level `docs/specification.md` unchanged and write feature specs to `docs/specifications/<feature-slug>.md`.

Use the bundled [specification template](assets/specification-template.md), adapted from `homework-3/specification-TEMPLATE-example.md`, as the required output structure.

## Routing Contract

| Input | Output |
|---|---|
| New feature | `docs/specifications/<feature-slug>.md` |
| Existing feature | Update the same feature file without losing approved decisions |
| Project-wide pipeline specification | Do not use this skill; use the explicit project-spec workflow for `docs/specification.md` |

Normalize the feature name to lowercase ASCII kebab-case. If a safe unambiguous slug cannot be derived, ask for an English slug before writing.

## Workflow

1. Read `AGENTS.md`, `README.md`, `docs/specification.md`, the latest `docs/log.md` entries, and relevant source/docs files.
2. Require a concrete feature name. Do not silently invent one.
3. Resolve `docs/specifications/<feature-slug>.md` and check whether it already exists.
4. Read [the bundled template](assets/specification-template.md) completely.
5. Inspect project context without making implementation changes.
6. Ask one clarifying question at a time only when the answer materially changes scope, architecture, security, data, or success criteria.
7. Fill every template section with concrete values. Preserve approved decisions when updating an existing spec.
8. Self-review the result against the quality gate below.
9. Write only the feature spec and append a factual `docs` entry to `docs/log.md`.
10. Suggest a Conventional Commit title. Do not run `git add` or `git commit`.

## Output Contract

Every generated feature spec contains:

- one High-Level Objective;
- 3–5 measurable Mid-Level Objectives;
- technical, data, security/privacy, error, performance and testing constraints;
- factual Beginning Context and exact Ending Context;
- explicit assumptions and out-of-scope boundary;
- Low-Level Tasks with exact prompt, files, interfaces/functions, details and verification;
- a Definition of Done.

Use `[ASSUMPTION]` for unconfirmed decisions. Distinguish current state from desired state. Do not describe planned code as implemented.

## Quality Gate

Before writing, verify:

- target path is under `docs/specifications/`;
- project-level `docs/specification.md` was not modified;
- no `TBD`, `TODO`, `{{...}}` or unfilled bracket placeholders remain;
- objectives are observable and testable;
- low-level tasks cover every objective and name exact artifacts/interfaces;
- money, PII, audit, error handling and test isolation are addressed when relevant;
- scope is small enough for one implementation plan;
- statements do not conflict with `AGENTS.md` or the project specification.

## Common Mistakes

| Mistake | Correction |
|---|---|
| Overwrite `docs/specification.md` | Route to `docs/specifications/<feature-slug>.md` |
| Copy every example from Homework 3 | Use only the universal bundled skeleton |
| Start implementation while drafting | Stop after the reviewed specification |
| Leave vague tasks such as “add tests” | Name exact files, behavior and verification commands |
| Invent requirements silently | Mark `[ASSUMPTION]` or ask a material clarifying question |
