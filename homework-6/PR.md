# Homework 6 — AI-powered multi-agent banking pipeline

> **Student:** ilia makarov
> **Stack:** TypeScript, Node.js, Fastify, Vitest, Decimal.js, Claude Code, MCP

## Goal

For Homework 6, we built more than a banking transaction application — we also built the AI infrastructure around it. AI meta-agents in Claude Code help create specifications, code, tests, and documentation. The actual business logic runs in a deterministic TypeScript pipeline, without any LLM involved.

## What was done, step by step:

1. **Set the project architecture and rules.** We separated AI meta-agents from the TypeScript pipeline agents, created a canonical `AGENTS.md`, documentation in `docs/`, an append-only `docs/log.md`, and a general specification.

2. **Built the AI meta-agent infrastructure for Claude Code.** We added four roles: `hw6-specification-agent`, `hw6-code-generation-agent`, `hw6-unit-test-agent`, and `hw6-documentation-agent`. All custom agents and skills use the `hw6-` prefix so they don't get confused with built-in tools.

3. **Added a specification workflow.** The `/hw6-write-spec` command generates a feature specification. For individual features, we use the `hw6-writing-feature-specifications` skill and the template from Homework 3; results are saved in `docs/specifications/<feature-slug>.md`.

4. **Implemented a modular TypeScript pipeline.** The `integrator` reads `sample-transactions.json` and passes each transaction through the following stages in sequence:
   - `transaction-validator` — checks required fields, a positive amount, and ISO 4217 currency;
   - `fraud-detector` — calculates a risk score based on amount, time, and cross-border indicators;
   - `compliance-checker` — produces the final status: `approved`, `review`, or `rejected`.

   Data is exchanged through JSON files in `shared/input`, `shared/processing`, `shared/output`, and `shared/results`. For a single transaction, the stages intentionally run sequentially, since each one depends on the result of the previous stage.

5. **Added CLI and HTTP API.** The pipeline runs via `npm run pipeline`, and the dry-run validator via `npm run validate:dry`. A read-only Fastify API exposes `/health`, `/summary`, and `/transactions/:transactionId`.

6. **Built tests and a quality gate.** Unit tests cover every pipeline agent, and integration tests cover the full pipeline; they are isolated from the real `shared/` directory. A coverage hook runs before `git push` and blocks the action if any coverage metric falls below 80%.

7. **Integrated Claude Code and MCP.** We added prefixed slash commands `/hw6-run-pipeline`, `/hw6-validate-transactions`, and `/hw6-write-spec`. A single project-scoped `.mcp.json` connects Context7 and a custom `pipeline-status` server. The custom MCP server exposes read-only tools `get_transaction_status` and `list_pipeline_results`, plus a `pipeline://summary` resource; it only returns a safe projection of the results, with no PII.

8. **Documented the setup and changes.** `README.md` explains the architecture, `HOWTORUN.md` contains step-by-step run instructions, `docs/research-notes.md` holds the Context7 research notes, and `docs/log.md` tracks the work history.

## Verification results

- `npm run pipeline`: 8 transactions — 3 `approved`, 3 `review`, 2 `rejected`.
- `npm run validate:dry`: 8 total, 6 valid, 2 invalid.
- `npm test` and `npm run test:coverage`: 87/87 tests passed; statements 95.93%, branches 92.35%, functions 96.61%, lines 96.16%.
- `npm run typecheck`: passed successfully.

## Screenshots for the PR

**Pipeline run** — full result of `npm run pipeline`.
![pipeline run](https://raw.githubusercontent.com/zpawn/gen-ai-software-engineering/homework-6-submission/homework-6/docs/screenshots/nw6-pipeline-run.png)

**Test coverage** — result of `npm run test:coverage` with coverage above 80%.
![test coverage](https://raw.githubusercontent.com/zpawn/gen-ai-software-engineering/homework-6-submission/homework-6/docs/screenshots/hw6-test-coverage.png)

**Skill run** — running `/hw6-run-pipeline` in Claude Code.
![skill run pipeline](https://raw.githubusercontent.com/zpawn/gen-ai-software-engineering/homework-6-submission/homework-6/docs/screenshots/hw6-skill-run-pipeline.png)

**Spec skill** — `/hw6-write-spec` generating a feature specification.
![spec skill](https://raw.githubusercontent.com/zpawn/gen-ai-software-engineering/homework-6-submission/homework-6/docs/screenshots/hw6-spec-skill.png)

**MCP: Context7** — a Context7 documentation query in Claude Code.
![mcp context7](https://raw.githubusercontent.com/zpawn/gen-ai-software-engineering/homework-6-submission/homework-6/docs/screenshots/hw6-mcp-context7.png)

**MCP: custom server** — the custom `pipeline-status` MCP tool call (`list_pipeline_results` or `get_transaction_status`).
![mcp custom](https://raw.githubusercontent.com/zpawn/gen-ai-software-engineering/homework-6-submission/homework-6/docs/screenshots/hw6-mcp-custom.png)

**Coverage hook trigger** — the coverage hook blocking a simulated `git push`.
![coverage hook trigger](https://raw.githubusercontent.com/zpawn/gen-ai-software-engineering/homework-6-submission/homework-6/docs/screenshots/hw6-trigger-hook.png)
