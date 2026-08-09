# Context7 Research Notes

Цей файл є хронологією фактично виконаних Context7-запитів. Кожен запис містить search text, обраний library ID, основний висновок і спосіб застосування.

> Поточні записи зроблено під час проєктування документаційного фундаменту. Коли code-generation meta-agent реалізовуватиме pipeline, він повинен додати щонайменше два окремі запити саме для code-generation stage, як вимагає Homework 6.

## [2026-08-09] Query 1 | Fastify TypeScript project structure

- **Search:** `Plan a TypeScript student project that uses Fastify as the application framework and may expose an MCP status server.`
- **Selected Context7 library ID:** `/fastify/fastify`
- **Why selected:** official Fastify repository documentation, high source reputation, exact framework match.
- **Key insight:** мінімальна TypeScript setup потребує `fastify`, `typescript` і Node types; Fastify підтримує typed routes, schema validation та plugin-based extension.
- **Applied:** Fastify зафіксовано як network/API integration framework, але CLI transaction pipeline не залежатиме від HTTP.

## [2026-08-09] Query 2 | Fastify TypeScript plugins

- **Search:** `What is the recommended basic TypeScript project setup and plugin-based application structure for a small Fastify application?`
- **Selected Context7 library ID:** `/fastify/fastify`
- **Key insight:** application can expose a Fastify factory and register typed plugins/routes, while startup/listen remains a separate responsibility.
- **Applied:** майбутній network layer буде відокремлено від deterministic pipeline modules; Fastify не використовуватиметься всередині business functions.

## [2026-08-09] Query 3 | Drizzle ORM with SQLite

- **Search:** `Plan a TypeScript student project using SQLite with Drizzle ORM for optional persistence.`
- **Selected Context7 library ID:** `/drizzle-team/drizzle-orm-docs`
- **Why selected:** official Drizzle documentation with extensive TypeScript/SQLite examples.
- **Key insight:** Drizzle supports SQLite through `node:sqlite`, `better-sqlite3`, libSQL and other drivers; a local file database can be initialized without a separate database server.
- **Applied:** SQLite + Drizzle залишено optional persistence layer. Driver will be selected only if the specification gains a durable-storage requirement.

## [2026-08-09] Query 4 | Claude Code project subagents

- **Search:** `How should project-scoped custom subagents be defined under .claude/agents, including required frontmatter and invocation from commands?`
- **Selected Context7 library ID:** `/websites/code_claude`
- **Key insight:** project subagents live in `.claude/agents/` as Markdown files with YAML frontmatter such as `name`, `description`, `tools`, optionally `model`; body text acts as the agent system prompt.
- **Applied:** architecture defines four project-scoped meta-agents with least-necessary tool lists.

## [2026-08-09] Query 5 | Claude Code custom commands

- **Search:** `How should project-scoped custom slash commands be defined under .claude/commands, including frontmatter, arguments, and invoking a subagent?`
- **Selected Context7 library ID:** `/websites/code_claude`
- **Key insight:** project commands are Markdown prompts with optional frontmatter including `description`, `allowed-tools`, `model` and argument hints.
- **Applied:** `/write-spec`, `/run-pipeline` and `/validate-transactions` are represented by project command files with explicit allowed tools and honest precondition checks.

## [2026-08-09] Query 6 | Claude Code blocking hooks

- **Search:** `How should .claude/settings.json configure a hook that can block a Bash git push until a coverage command succeeds? Include matcher behavior and hook exit codes.`
- **Selected Context7 library ID:** `/websites/code_claude`
- **Key insight:** a `PreToolUse` hook can match `Bash`, inspect tool input from stdin and block a tool call with exit code `2`; exit code `0` keeps normal permission flow.
- **Applied:** `.claude/settings.json` will call a project hook that checks whether the command is `git push` and runs the configured coverage command when available.

## [2026-08-09] Query 7 | Claude Code project skill structure

- **Search:** `How should a project-scoped Claude Code skill be structured under .claude/skills, how does an agent invoke or reference that skill, and how should bundled template assets be referenced from SKILL.md?`
- **Selected Context7 library ID:** `/websites/code_claude`
- **Key insight:** project skills use a required `SKILL.md` and may bundle templates/examples/scripts; supporting files are linked with paths relative to the skill directory.
- **Applied:** `hw6-writing-feature-specifications` stores its reusable template in `assets/specification-template.md` and links it directly from `SKILL.md`.

## [2026-08-09] Query 8 | Preloading skill in a Claude subagent

- **Search:** `How can a Claude Code custom subagent preload or use project skills from .claude/skills? What frontmatter field or invocation syntax should .claude/agents/hw6-specification-agent.md use?`
- **Selected Context7 library ID:** `/websites/code_claude`
- **Key insight:** custom subagent frontmatter supports a `skills` list that injects selected skill content when the subagent starts.
- **Applied:** `hw6-specification-agent` preloads `hw6-writing-feature-specifications` through its `skills` frontmatter field.

## [2026-08-09] Query 9 | Delegating from a custom command

- **Search:** `How should a custom Claude Code slash command delegate to a named custom subagent, and which allowed-tools entry is required for that delegation?`
- **Selected Context7 library ID:** `/websites/code_claude`
- **Key insight:** a command can request delegation by naming the custom subagent; `Agent` must be available for auto-approved subagent calls.
- **Applied:** `/write-spec` explicitly names `hw6-specification-agent` and includes `Agent` in `allowed-tools`.
