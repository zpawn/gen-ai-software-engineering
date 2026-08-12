---
description: Create or update a feature specification; --project updates the general pipeline specification.
argument-hint: [feature-name | --project]
allowed-tools: Read, Grep, Glob, Write, Edit, Agent
---

Use the project subagent `hw6-specification-agent` through `/hw6-write-spec` to create or update a specification.

Pass these arguments: `$ARGUMENTS`.

- If `$ARGUMENTS` is empty, stop and ask for a feature name. Do not invent one.
- If `$ARGUMENTS` is `--project`, use project mode with `docs/specification.md`.
- Otherwise, use feature mode with the preloaded skill `hw6-writing-feature-specifications` and write to `docs/specifications/<feature-slug>.md`.

Required workflow:

1. Read `AGENTS.md`, `TASKS.md`, `README.md`, and approved designs in `docs/superpowers/specs/`.
2. In feature mode, read `docs/specification.md` as project context but do not change it.
3. In project mode, review the existing `docs/specification.md` before editing. Do not overwrite approved decisions without an explanation.
4. Do not create specification files in the root.
5. Make sure the document includes:
   - High-Level Objective;
   - in project mode, 4–5 measurable Mid-Level Objectives;
   - in feature mode, 3–5 measurable Mid-Level Objectives;
   - Implementation Notes;
   - Beginning/Ending Context;
   - Low-Level Tasks with an exact prompt, file, function, and details.
6. For a feature spec, also check assumptions, out-of-scope boundaries, Definition of Done, and absence of template placeholders.
7. Check precise money, ISO 4217, audit logging, PII redaction, the JSON message envelope, `shared/` directories, summary, and coverage requirements when relevant.
8. Show a short summary of changes and a list of assumptions.
9. Append an entry to `docs/log.md` if it exists.
10. Do not run `git add` or `git commit`; suggest a Conventional Commit title.
