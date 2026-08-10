# Context7 Research Notes

This file is a timeline of Context7 queries actually executed. Each record contains search text, selected library ID, main conclusion and method of application.

> Entries cover design and code-generation stage. Queries 13–14 are executed immediately before implementing the Fastify API.

## [2026-08-09] Query 1 | Fastify TypeScript project structure

- **Search:** `Plan a TypeScript student project that uses Fastify as the application framework and may expose an MCP status server.`
- **Selected Context7 library ID:** `/fastify/fastify`
- **Why selected:** official Fastify repository documentation, high source reputation, exact framework match.
- **Key insight:** minimal TypeScript setup requires `fastify`, `typescript` and Node types; Fastify supports typed routes, schema validation and plugin-based extension.
- **Applied:** Fastify is used for the network/API layer, while the CLI transaction pipeline stays independent from HTTP.

## [2026-08-09] Query 2 | Fastify TypeScript plugins

- **Search:** `What is the recommended basic TypeScript project setup and plugin-based application structure for a small Fastify application?`
- **Selected Context7 library ID:** `/fastify/fastify`
- **Key insight:** application can expose a Fastify factory and register typed plugins/routes, while startup/listen remains a separate responsibility.
- **Applied:** the network layer is separate from deterministic pipeline modules; Fastify is not used inside business functions.

## [2026-08-09] Query 3 | Drizzle ORM with SQLite

- **Search:** `Plan a TypeScript student project using SQLite with Drizzle ORM for optional persistence.`
- **Selected Context7 library ID:** `/drizzle-team/drizzle-orm-docs`
- **Why selected:** official Drizzle documentation with extensive TypeScript/SQLite examples.
- **Key insight:** Drizzle supports SQLite through `node:sqlite`, `better-sqlite3`, libSQL and other drivers; a local file database can be initialized without a separate database server.
- **Applied:** SQLite + Drizzle left optional persistence layer. Driver will be selected only if the specification gains a durable-storage requirement.

## [2026-08-09] Query 4 | Claude Code project subagents

- **Search:** `How should project-scoped custom subagents be defined under .claude/agents, including required frontmatter and invocation from commands?`
- **Selected Context7 library ID:** `/websites/code_claude`
- **Key insight:** project subagents live in `.claude/agents/` as Markdown files with YAML front matter such as `name`, `description`, `tools`, optionally `model`; body text acts as the agent system prompt.
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

## [2026-08-09] Query 10 | Fastify app factory and route testing

- **Search:** `How should a strict TypeScript Fastify application expose typed read-only GET routes, separate app construction from listen startup, and test routes using Fastify inject?`
- **Selected Context7 library ID:** `/fastify/fastify`
- **Why selected:** official Fastify repository documentation, high source reputation, exact framework match.
- **Key insight:** Fastify recommends separating the app factory from the server startup; typed route generics and JSON schemas provide request typing, and `fastify.inject()` tests routes without opening a network port.
- **Applied:** Task 2 design uses `buildApp(options)` in `src/api/app.ts`, separate `src/api/server.ts` and API tests via `app.inject()`.

## [2026-08-09] Query 11 | Decimal.js for monetary comparisons

- **Search:** `How should Decimal.js validate decimal strings and perform exact greater-than comparisons in TypeScript without converting monetary values to JavaScript number?`
- **Selected Context7 library ID:** `/mikemcl/decimal.js`
- **Why selected:** official Decimal.js repository, high source reputation and the best exact package match.
- **Key insight:** monetary values should be passed to `Decimal` as strings, invalid constructor input should be processed explicitly, and comparisons should be performed using Decimal methods like `gt`/`gte`.
- **Applied:** validator parsing and fraud threshold comparison will not use `number`, `parseFloat` or implicit numeric coercion.

## [2026-08-09] Query 12 | Vitest V8 coverage

- **Search:** `How to configure Vitest V8 coverage thresholds, include source files, and test Node filesystem code with temporary directories in a TypeScript project?`
- **Selected Context7 library ID:** `/vitest-dev/vitest/v4.1.6`
- **Why selected:** official Vitest documentation with version-specific ID for the current major version.
- **Key insight:** `coverage.provider: "v8"`, explicit `coverage.include` and numeric thresholds allow you to take into account even non-imported source files and block the suite below a given level.
- **Applied:** `vitest.config.ts` will include `src/**/*.ts`, gate 80% and text/html/lcov reporters; integration tests will use OS temporary directories.

## [2026-08-10] Query 13 | Fastify 5 typed route schemas

- **Search:** `Fastify 5 TypeScript app factory with typed route params and JSON response schemas for GET routes.`
- **Selected Context7 library ID:** `/fastify/fastify`
- **Why selected:** official Fastify repository, high source reputation, exact framework match.
- **Key insight:** Fastify 5 requires full JSON Schema with `type: "object"` for params/query/body; route generics are typed by params/replies, and response schemas are specified by HTTP status code.
- **Applied:** `src/api/app.ts` uses typed `TransactionParams`, typed replies and full schemas for health, transaction result, summary and controlled errors.

## [2026-08-10] Query 14 | Fastify injection testing

- **Search:** `Fastify 5 testing an app factory with app.inject for GET routes without listen, and proper app.close cleanup.`
- **Selected Context7 library ID:** `/fastify/fastify`
- **Key insight:** application factory is tested via `app.inject()` without network listener; each test app must be closed via `app.close()`.
- **Applied:** `tests/api/app.test.ts` checks all read-only routes via inject and closes Fastify instances in cleanup.

## [2026-08-10] Query 15 | TypeScript MCP studio server

- **Search:** `Build a Node.js TypeScript stdio MCP server that exposes tools with input schemas and a text resource, using the current official SDK.`
- **Selected Context7 library ID:** `/modelcontextprotocol/typescript-sdk/v1.29.0`
- **Why selected:** official TypeScript SDK repository, high source reputation, version-specific stable v1.x documentation and the most relevant code snippets.
- **Key insight:** local server uses `McpServer`, `registerTool`, `registerResource` and `StdioServerTransport`; Zod raw shapes set tool input validation; The SDK and `zod` are installed together.
- **Applied:** implemented separate `mcp/server.ts` and `mcp/stdio.ts`, Zod input schema, two tools and static resource `pipeline://summary`.

## [2026-08-10] Query 16 | Claude Code project MCP configuration

- **Search:** `What is the current Claude Code project-scoped MCP server configuration filename and JSON format for stdio servers? Does Claude Code load mcp.json or .mcp.json from the project root?`
- **Selected Context7 library ID:** `/websites/code_claude`
- **Why selected:** current official Claude Code documentation, previously used for project commands and hooks.
- **Key insight:** Claude Code automatically reads project-scoped servers with `.mcp.json`, requires first-use approval and supports stdio entries with `command` and `args`; The literal `mcp.json` from Homework 6 is not itself an auto-loaded Claude config.
- **Applied:** the student chose a single `.mcp.json` for the actual Claude Code runtime; duplicate `mcp.json` is not created.

## [2026-08-10] Query 17 | In-memory MCP integration tests

- **Search:** `How to integration test an McpServer in TypeScript without stdio using InMemoryTransport and Client, including listing and calling tools and reading a resource?`
- **Selected Context7 library ID:** `/modelcontextprotocol/typescript-sdk/v1.29.0`
- **Key insight:** `InMemoryTransport.createLinkedPair()` connects the `Client` and `McpServer` SDKs without the process/network transport and allows end-to-end validation, tool calls and resource reads.
- **Applied:** `tests/mcp/server.test.ts` uses real SDK `Client` and `InMemoryTransport`, and `tests/mcp/config.test.ts` separately runs configured stdio process without network port and real `shared/`.

## [2026-08-10] Query 18 | Current MCP SDK v1.x after security audit

- **Search:** `Are McpServer registerTool, registerResource, StdioServerTransport, Client, and InMemoryTransport still the supported APIs in the current v1.x TypeScript SDK?`
- **Selected Context7 library ID:** `/modelcontextprotocol/typescript-sdk/__branch__v1.x`
- **Why selected:** Context7 has not yet indexed the release-specific ID v1.30.0, so the official up-to-date v1.x branch documentation is selected.
- **Key insight:** `McpServer`, `registerTool`, `registerResource` and stdio remain supported v1.x APIs for local process-spawned integrations.
- **Applied:** production dependency updated to `@modelcontextprotocol/sdk` 1.30.0; compatible transitive `@hono/node-server` updated to 2.1.0 after audit advisory, no API changes in MCP layer.
