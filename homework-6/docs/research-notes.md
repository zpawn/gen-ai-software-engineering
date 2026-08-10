# Context7 Research Notes

Цей файл є хронологією фактично виконаних Context7-запитів. Кожен запис містить search text, обраний library ID, основний висновок і спосіб застосування.

> Записи охоплюють проєктування та code-generation stage. Запити 13–14 виконано безпосередньо перед реалізацією Fastify API.

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
- **Applied:** `/hw6-write-spec`, `/hw6-run-pipeline` and `/hw6-validate-transactions` are represented by project command files with explicit allowed tools and honest precondition checks.

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
- **Applied:** `/hw6-write-spec` explicitly names `hw6-specification-agent` and includes `Agent` in `allowed-tools`.

## [2026-08-09] Query 10 | Fastify app factory та route testing

- **Search:** `How should a strict TypeScript Fastify application expose typed read-only GET routes, separate app construction from listen startup, and test routes using Fastify inject?`
- **Selected Context7 library ID:** `/fastify/fastify`
- **Why selected:** official Fastify repository documentation, high source reputation, exact framework match.
- **Key insight:** Fastify рекомендує відокремлювати app factory від server startup; typed route generics і JSON schemas забезпечують request typing, а `fastify.inject()` тестує routes без відкриття network port.
- **Applied:** Task 2 design використовує `buildApp(options)` у `src/api/app.ts`, окремий `src/api/server.ts` і API tests через `app.inject()`.

## [2026-08-09] Query 11 | Decimal.js для monetary comparisons

- **Search:** `How should Decimal.js validate decimal strings and perform exact greater-than comparisons in TypeScript without converting monetary values to JavaScript number?`
- **Selected Context7 library ID:** `/mikemcl/decimal.js`
- **Why selected:** official Decimal.js repository, high source reputation і найкращий exact package match.
- **Key insight:** monetary values треба передавати в `Decimal` як strings, invalid constructor input обробляти явно, а comparisons виконувати через Decimal methods на кшталт `gt`/`gte`.
- **Applied:** validator parsing і fraud threshold comparison не використовуватимуть `number`, `parseFloat` або implicit numeric coercion.

## [2026-08-09] Query 12 | Vitest V8 coverage

- **Search:** `How to configure Vitest V8 coverage thresholds, include source files, and test Node filesystem code with temporary directories in a TypeScript project?`
- **Selected Context7 library ID:** `/vitest-dev/vitest/v4.1.6`
- **Why selected:** official Vitest documentation із version-specific ID для актуальної major version.
- **Key insight:** `coverage.provider: "v8"`, explicit `coverage.include` і numeric thresholds дозволяють врахувати навіть неімпортовані source files та блокувати suite нижче заданого рівня.
- **Applied:** `vitest.config.ts` включатиме `src/**/*.ts`, gate 80% і text/html/lcov reporters; integration tests використовуватимуть OS temporary directories.

## [2026-08-10] Query 13 | Fastify 5 typed route schemas

- **Search:** `Fastify 5 TypeScript app factory with typed route params and JSON response schemas for GET routes.`
- **Selected Context7 library ID:** `/fastify/fastify`
- **Why selected:** official Fastify repository, high source reputation, exact framework match.
- **Key insight:** Fastify 5 потребує full JSON Schema з `type: "object"` для params/query/body; route generics типізують params/replies, а response schemas задаються за HTTP status code.
- **Applied:** `src/api/app.ts` використовує typed `TransactionParams`, typed replies і full schemas для health, transaction result, summary та controlled errors.

## [2026-08-10] Query 14 | Fastify inject testing

- **Search:** `Fastify 5 testing an app factory with app.inject for GET routes without listen, and proper app.close cleanup.`
- **Selected Context7 library ID:** `/fastify/fastify`
- **Key insight:** application factory тестується через `app.inject()` без network listener; кожен test app треба закривати через `app.close()`.
- **Applied:** `tests/api/app.test.ts` перевіряє всі read-only routes через inject і закриває Fastify instances у cleanup.
