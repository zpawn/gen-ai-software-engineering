# Design Task 4: modular MCP layer

## Purpose and limits

Task 4 adds read-only integration between Claude Code and already generated JSON results. MCP server is not a new pipeline agent, does not execute banking decisions and does not run a pipeline. It only reads validated files through the existing results repository and returns the minimum safe projection.

Canonical feature requirements are described in `docs/specifications/task-4-mcp-integration.md`.

## Selected approach

A modular TypeScript MCP layer of three components is used:

```text
Claude Code
    │ stdio MCP
    ▼
mcp/stdio.ts
    │ creates/connects
    ▼
mcp/server.ts
    │ delegates
    ▼
mcp/handlers.ts
    │ reuses
    ▼
src/infrastructure/results-repository.ts
    │ reads
    ▼
shared/results/*.json
```

- `handlers.ts` is independent of the MCP SDK and includes safe projection and summary formatting.
- `server.ts` registers protocol-facing tools/resource and converts domain errors into secure MCP responses.
- `stdio.ts` is a minimal process entry point without business logic.

Rejected single-file server due to mixing filesystem, security projection and protocol concerns. Rejected Fastify bridge because local stdio integration does not require HTTP.

## MCP contract

### `get_transaction_status`

Input:

```json
{ "transaction_id": "TXN001" }
```

Output contains only:

```json
{
  "transactionId": "TXN001",
  "status": "approved",
  "reasonCodes": [],
  "riskScore": 0,
  "riskFlags": []
}
```

Optional risk fields are skipped if they are not in the final result. `explanation`, `auditTrail` and raw data are never included in the MCP response.

### `list_pipeline_results`

Returns validated content `summary.json`:

```json
{ "total": 8, "approved": 3, "review": 3, "rejected": 2 }
```

### `pipeline://summary`

Static text resource returns a deterministic human-readable summary with the same four counters and MIME type `text/plain`.

## Configuration

The Homework 6 formulation calls the file `mcp.json`, but the current Claude Code automatically loads the project servers with `.mcp.json`. The student chose one working `.mcp.json` for the actual Claude Code workflow; duplicate config is not created.

- `context7`: `npx -y @upstash/context7-mcp@latest`.
- `pipeline-status`: local Node process with TypeScript entry point `mcp/stdio.ts` through installed `tsx` loader.
- `RESULTS_DIR`: `shared/results` by default and configurable environment override.

Claude Code will ask the user to separately approve the MCP server project the first time `.mcp.json` is detected.

## Bugs and security

Existing `results-repository.ts` remains the only place for path validation and JSON shape validation. MCP handlers do not read files directly.

Tool failures return `isError: true` and a stable safe message. Resource failure uses protocol error without absolute path or malformed content. Unsafe transaction ID has the same external result as absent ID so as not to reveal filesystem details.

Server does not register write operations. stdout stdio process is reserved for MCP JSON-RPC; diagnostics, if needed, are sent only to stderr.

## Testing

1. Handlers are tested through a temporary directory: safe projection, summary text, missing/malformed input and no PII.
2. Server is tested by SDK `Client` and `InMemoryTransport`: list/call tools, list/read resource, schema validation and controlled errors.
3. Config verification checks valid JSON and required server names in `.mcp.json`.
4. Stdio smoke confirms the startup protocol without HTTP and without writes to `shared/`.
5. Final gate: full tests, coverage, typecheck, diff check and PII scan MCP output.

The Claude interaction screenshot is not included in the implementation slice: the student will make it along with the other submission screenshots at the end.
