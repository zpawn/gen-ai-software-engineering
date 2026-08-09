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

