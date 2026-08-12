# How to Run Homework 6

Run all commands from the `homework-6` root directory unless a step says otherwise.

## 1. Requirements

- Node.js 22 or newer;
- npm;
- Claude Code for AI meta-agents, slash commands, hooks, and MCP demos.

Check installed versions:

```bash
node --version
npm --version
claude --version
```

Claude Code is not required when you only run the TypeScript application and tests.

## 2. Install Dependencies

```bash
npm install
```

This installs Fastify, Decimal.js, the TypeScript MCP SDK, Vitest, and other locked dependencies.

## 3. Run the Transaction Pipeline

```bash
npm run pipeline
```

The pipeline reads `sample-transactions.json`, runs the validator, fraud detector, and compliance checker in sequence, writes final results, and creates `shared/results/summary.json`.

Expected safe output:

```text
total=8
approved=3
review=3
rejected=2
rejected=TXN006: UNSUPPORTED_CURRENCY
rejected=TXN007: NON_POSITIVE_AMOUNT
```

Check the result files:

```bash
ls shared/results
```

The directory contains `TXN001.json` through `TXN008.json` and `summary.json`.

> A full run clears runtime files in `shared/input`, `shared/processing`, `shared/output`, and `shared/results`. Do not store personal files there.

## 4. Run Validation Only

```bash
npm run validate:dry
```

This command does not run fraud or compliance stages and does not change `shared/results/`.

Expected output:

```text
total=8
valid=6
invalid=2
rejected=TXN006: UNSUPPORTED_CURRENCY
rejected=TXN007: NON_POSITIVE_AMOUNT
```

## 5. Run Project Checks

```bash
npm test
npm run test:coverage
npm run typecheck
```

The coverage gate requires at least 80% for statements, branches, functions, and lines. The project target is at least 90%.

## 6. Run the Fastify API

Create current results and start the server:

```bash
npm run pipeline
npm run api
```

The default address is `http://127.0.0.1:3000`. In another terminal, run:

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/summary
curl http://127.0.0.1:3000/transactions/TXN001
```

Stop the server with `Ctrl+C`. Use another port when needed:

```bash
PORT=3001 npm run api
```

## 7. Use Claude Code Commands

Start Claude Code from the repository root:

```bash
claude
```

Available project commands:

```text
/hw6-run-pipeline
/hw6-validate-transactions
/hw6-write-spec <feature-name>
```

The first command runs the full pipeline and shows a safe summary. The second runs validation only. The third creates a feature specification in `docs/specifications/<feature-slug>.md`.

## 8. Use MCP Servers

The root `.mcp.json` configures `context7` and `pipeline-status`. First create current results:

```bash
npm run pipeline
claude
```

Approve both project MCP servers when Claude Code asks. Use `/mcp` in Claude Code to inspect them, or run:

```bash
claude mcp get context7
claude mcp get pipeline-status
```

Example prompts:

```text
Use Context7 to find the current Fastify documentation for creating a GET route in TypeScript. Briefly show the recommended pattern.
```

```text
Use the pipeline-status MCP tool list_pipeline_results and show the latest pipeline summary.
```

```text
Use the pipeline-status MCP tool get_transaction_status for transaction_id TXN002.
```

```text
Read the MCP resource pipeline://summary.
```

The custom MCP server does not expose raw transactions, account data, explanations, or audit trails.

## 9. Test the Coverage Hook Safely

The configured hook is a Claude Code `PreToolUse` hook, not a native Git hook. A regular `git push` typed in a separate terminal does not trigger it.

Simulate the Claude Code hook without a real push:

```bash
printf '%s' '{"tool_input":{"command":"git push"}}' | CLAUDE_PROJECT_DIR="$PWD" .claude/hooks/coverage-gate.sh
```

The hook runs `npm run test:coverage` and ends with `Coverage gate passed.` when all checks pass.

## 10. Troubleshooting

### Unsupported Node.js version

Run `node --version`. The project requires Node.js 22 or newer.

### API or MCP cannot find a summary

Run `npm run pipeline`, then repeat the request.

### MCP status is `Pending approval`

Start interactive `claude` from the repository root and approve the project configuration through the prompt or `/mcp`.

### Port 3000 is busy

```bash
PORT=3001 npm run api
```

### Dependencies need repair

```bash
npm install
```
