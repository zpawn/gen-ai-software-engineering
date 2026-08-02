# Claude Code Plugin Layout Design

## Goal

Implement Homework 4 specifically for Claude Code while keeping homework-owned
agents and skills visually separate from third-party skills installed into the
project.

## Decision

The repository root will act as a local Claude Code plugin loaded with
`claude --plugin-dir .`. Homework components will use Claude Code's plugin
layout:

```text
.claude-plugin/plugin.json
agents/*.agent.md
skills/<skill-name>/SKILL.md
scripts/run-pipeline.mjs
```

Existing third-party skills remain under `.claude/skills/` and continue to be
tracked by `skills-lock.json`. No homework-specific agent or skill will be
placed in `.claude/skills/`.

## Ownership Boundary

| Path | Owner | Purpose |
| --- | --- | --- |
| `.claude/skills/` | Installed dependencies | Third-party project skills |
| `skills-lock.json` | Skill installer | Installed-skill lock data |
| `.claude-plugin/` | Homework | Local plugin manifest |
| `agents/` | Homework | Six pipeline subagents |
| `skills/` | Homework | Two required pipeline skills |
| `scripts/` | Homework | One-command orchestration |
| `context/bugs/` | Homework outputs | Scenario inputs and generated reports |

## Components

### Plugin manifest

`.claude-plugin/plugin.json` identifies the repository as a local Claude Code
plugin. It will use this minimal manifest:

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

Default `agents/` and `skills/` paths are used, so the manifest does not
override component paths.

### Agents

Claude Code discovers Markdown agents in `agents/`. The assignment-facing
`.agent.md` suffix is retained because each filename still ends in `.md` and
matches the deliverable names in `TASKS.md`.

Each agent will declare at least `name`, `description`, `model`, and `tools` in
YAML frontmatter. Read-only agents receive only read/search tools. Write tools
are limited to the Bug Fixer and Unit Test Generator according to their roles.
Plugin agents do not rely on `permissionMode`, because Claude Code ignores that
field for plugin-shipped agents; least privilege is enforced with `tools` and
`disallowedTools`.

### Skills

Claude Code skills use one directory per skill with a required `SKILL.md`:

```text
skills/research-quality-measurement/SKILL.md
skills/unit-tests-first/SKILL.md
```

This intentionally replaces the flat `skills/*.md` examples in `TASKS.md` with
Claude Code's native format. The README will document that mapping.

### Orchestrator

`scripts/run-pipeline.mjs` will invoke Claude Code non-interactively with
`claude -p`, load the repository using `--plugin-dir .`, and select each stage
with its scoped name, for example
`--agent homework-4-agent-pipeline:research-verifier`. It will not use
`--bare`, because normal project/plugin discovery is required.

## Data Flow

```text
bug-context.md
→ codebase-research.md
→ verified-research.md
→ implementation-plan.md
→ production fixes + fix-summary.md
→ security-report.md
→ generated tests + test-report.md
```

Each stage validates that its required input exists before starting and that
its output exists and contains required headings before the next stage starts.

## Error Handling

- A missing or empty input stops the current stage.
- Research verification failure stops the pipeline before planning.
- A Bug Fixer test failure stops security and test-generation stages.
- A read-only agent changing files is a pipeline failure.
- A final build or test failure returns a non-zero pipeline exit code.

## Verification

- Confirm Claude Code version and CLI flags locally.
- Validate the manifest with `claude plugin validate . --strict`.
- Confirm the plugin discovers all six agent names and both skills.
- Verify homework files do not appear under `.claude/skills/`.
- Verify generated reports remain absent until an actual pipeline run.
- Run `git diff --check` after documentation and scaffolding changes.

## Scope

This design establishes layout and contracts only. It does not yet implement
agent prompts, skill instructions, orchestration logic, generated reports, or
production fixes.
