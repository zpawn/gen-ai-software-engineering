# Design of HW6-prefixes for own skills and agents

## Goal

Clearly distinguish Claude Code skill and AI meta-agents created in Homework 6 from built-in and third-party entities.

## Naming map

| Type | Current name | New name |
|---|---|---|
| Skill | `writing-feature-specifications` | `hw6-writing-feature-specifications` |
| Agent | `specification-agent` | `hw6-specification-agent` |
| Agent | `code-generation-agent` | `hw6-code-generation-agent` |
| Agent | `unit-test-agent` | `hw6-unit-test-agent` |
| Agent | `documentation-agent` | `hw6-documentation-agent` |

The name of the skill changes simultaneously in the directory path and `name` frontmatter. Agents names are changed simultaneously in filenames and `name` frontmatter. All commands, agent references, documentation, designs, plans, evaluations and validation commands are updated with new names.

## Borders

- Slash commands `/write-spec`, `/run-pipeline` and `/validate-transactions` are not renamed.
- Superpowers skills in `.claude/skills/` are not renamed because they were not created within Homework 6.
- TypeScript pipeline agents are not included in this rename: they are application components, not Claude Code AI meta-agents.
- Git staging and commit are not performed.

## Verification

1. There are only four HW6-agent filenames prefixed with `hw6-` in `.claude/agents/`.
2. Custom skill exists only on the path `.claude/skills/hw6-writing-feature-specifications/` and has a matching frontmatter name.
3. `/write-spec` delegates `hw6-specification-agent`, which preloads `hw6-writing-feature-specifications`.
4. Searching for old names does not find active references, except for append-only historical records in `docs/log.md`.
5. Official skill validator, Markdown fence check and `git diff --check` pass.

## Risks and Safeguards

The main risk is to leave the old name in the command or agent frontmatter, because of which Claude Code will not find the dependency. Therefore, rename is performed atomically according to the naming map, and then a repository-wide reference scan is launched.
