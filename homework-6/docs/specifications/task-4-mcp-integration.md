# Task 4 MCP Integration Specification

> Ingest this specification, implement its Low-Level Tasks, and verify the resulting code against the High-Level and Mid-Level Objectives. Do not treat desired-state statements as evidence that implementation already exists.

**Feature slug:** `task-4-mcp-integration`
**Status:** implemented and automatically checked; interactive Claude approval and screenshot deferred to the student
**Last updated:** 2026-08-10

## High-Level Objective

Give Claude Code read-only access to the actual results of the transaction pipeline through the modular TypeScript MCP server and add Context7 and pipeline-status to the project MCP configuration.

## Mid-Level Objectives

1. Project MCP configuration in `.mcp.json` contains two stdio servers — `context7` and `pipeline-status` — and automatically loads Claude Code from the Homework 6 root.
2. Tool `get_transaction_status(transaction_id: string)` reads one final result from configured `shared/results/` and returns only `transactionId`, `status`, `reasonCodes`, `riskScore` and `riskFlags`.
3. Tool `list_pipeline_results()` and resource `pipeline://summary` read latest `summary.json` and return only `total`, `approved`, `review` and `rejected`.
4. Missing, malformed, or unsafe inputs terminate with a controlled error without leaking filesystem paths, raw JSON, account numbers, descriptions, or audit trail.
5. Handlers and MCP registration are checked by isolated unit/integration tests; the general coverage gate remains at least 80%, and the actual target is at least 90%.

## Implementation Notes

### Technical Constraints

- Runtime — Node.js 22+, language — TypeScript strict mode.
- Use official `@modelcontextprotocol/sdk` v1.30.x, `zod` for tool input schema and `StdioServerTransport` for local Claude Code integration.
- MCP layer is modular: pure read-only handlers, MCP registration factory and separate stdio entry point.
- Reuse `src/infrastructure/results-repository.ts`; do not duplicate parsing and path-safety rules.
- Do not add Fastify, SQLite, Drizzle, HTTP transport or write tools to the MCP layer.

### Data and Interfaces

- `getTransactionStatus(resultsDirectory: string, transactionId: string): Promise<SafeTransactionStatus>` returns safe projection without `explanation` and `auditTrail`.
- `listPipelineResults(resultsDirectory: string): Promise<PipelineSummary>` returns validated content `summary.json`.
- `getPipelineSummaryResource(resultsDirectory: string): Promise<string>` forms deterministic text from four summary counters.
- `createPipelineStatusServer(options: { resultsDirectory: string }): McpServer` registers two tools and a static resource URI `pipeline://summary`.
- `mcp/stdio.ts` defines `RESULTS_DIR` from environment or uses `shared/results` relative to project root, creates transport and connects server.
- Tool content is returned as JSON text; resource content has MIME type `text/plain`.

### Security, Privacy and Audit

- MCP server has only read-only capabilities and does not change `shared/`.
- Transaction status does not contain raw transaction, account numbers, names, description, `explanation` or `auditTrail`.
- Summary does not contain transaction-level data.
- Error content uses only stable secure messages and codes; absolute paths, malformed file content and user-provided traversal input are not returned.
- A separate MCP audit log is not added: the server does not execute financial decisions and only reads already audited results.

### Error Handling and Reliability

- `TRANSACTION_NOT_FOUND` is returned as a controlled tool error for ID unknown/unsafe.
- `SUMMARY_NOT_FOUND` and `RESULTS_READ_ERROR` map to safe MCP errors without internal details.
- Resource callback returns a protocol-safe error if summary is not available.
- stdout stdio process is reserved for MCP protocol; startup diagnostics are only allowed via stderr.
- Server does not create fallback or fabricated results.

### Performance

- Tool status performs one validated JSON file read; summary tool/resource perform one `summary.json` read.
- Directory scanning is not needed, because the canonical summary is already created by the pipeline.
- This is a local student workflow; load testing and caching are not required.

### Testing and Verification

- TDD: handlers are first checked by failing tests in the temporary results directory.
- MCP integration tests use SDK `InMemoryTransport` and `Client`, without network port and without real `shared/`.
- Check tool listing, valid/invalid tool calls, resource listing/read, safe projections and PII absence.
- Run `npm test`, `npm run test:coverage`, `npm run typecheck` and `git diff --check`.
- Run stdio smoke test or SDK client process test without writing pipeline results.

## Context

### Beginning Context

- Tasks 1–3 are implemented; TypeScript pipeline creates validated results in `shared/results/`.
- `src/infrastructure/results-repository.ts` already safely reads one transaction result and summary.
- `.mcp.json`, `mcp/` and MCP SDK dependencies are missing.
- `docs/research-notes.md` already contains Context7 research for the pipeline and will be supplemented with actual MCP SDK/Claude Code queries.

### Ending Context

- There are `mcp/handlers.ts`, `mcp/server.ts`, `mcp/stdio.ts` and MCP tests.
- There is `.mcp.json` with two required servers; Claude Code automatically loads it as a project-scoped configuration.
- A single `.mcp.json` contains `context7` and `pipeline-status`.
- Claude Code can call `get_transaction_status`, `list_pipeline_results` and read `pipeline://summary` after user approval of the new project MCP server.
- `docs/research-notes.md` contains the exact Context7 library IDs, conclusions and applications.
- `docs/screenshots/mcp-interaction.png` remains a manual deliverable of the final stage at the student's decision.

## Assumptions

- [ASSUMPTION] The formulation of Homework 6 calls the file `mcp.json`, but for the working Claude Code case, the student deliberately chose the only `.mcp.json`, which Claude Code automatically reads.
- [ASSUMPTION] Claude Code is launched from the root `homework-6`, so the relative path `shared/results` and `mcp/stdio.ts` will be resolved from the root of the project.
- [ASSUMPTION] Within Task 4, a screenshot is created by the student at the end, as agreed for all submission screenshots.

## Out of Scope

- Run or reprocess pipeline through MCP.
- Change, approve/reject or delete transaction results.
- HTTP/SSE transport, authentication, remote deployment and multi-user access.
- Return full `PipelineResult`, raw transaction or audit trail.
- Creating a screenshot in the current implementation stage.

## Low-Level Tasks

### Task 1: Safe MCP handlers

**Prompt:** "Read `AGENTS.md`, project spec and this feature spec. Through TDD, create read-only TypeScript handlers on top of existing results repository. Status handler should return only safe projection, summary handlers — only four counters. Do not return explanation, auditTrail, filesystem paths or raw malformed content."
**Files to CREATE/UPDATE:** `mcp/handlers.ts`, `tests/mcp/handlers.test.ts`
**Interfaces/Functions:** `getTransactionStatus(resultsDirectory: string, transactionId: string): Promise<SafeTransactionStatus>`; `listPipelineResults(resultsDirectory: string): Promise<PipelineSummary>`; `getPipelineSummaryResource(resultsDirectory: string): Promise<string>`
**Details:** Reuse `readTransactionResult` and `readPipelineSummary`; save optional risk fields only when they exist; errors must not include unsafe input or path.
**Verification:** `npm test -- tests/mcp/handlers.test.ts` completes without failures and tests use only temporary directory.

### Task 2: MCP server registration

**Prompt:** "Use the Context7 documentation of the current v1.x branch `@modelcontextprotocol/sdk`. Through TDD create a `McpServer` factory, register tools `get_transaction_status`, `list_pipeline_results` and static resource `pipeline://summary`, add Zod input validation and safe mapping errors in MCP responses."
**Files to CREATE/UPDATE:** `mcp/server.ts`, `tests/mcp/server.test.ts`
**Interfaces/Functions:** `createPipelineStatusServer(options: PipelineStatusServerOptions): McpServer`
**Details:** Integration tests use `InMemoryTransport.createLinkedPair()` and SDK `Client`; check exact names, valid responses, invalid input, controlled missing-result error and resource content.
**Verification:** `npm test -- tests/mcp/server.test.ts` passes with tool/resource calls via in-memory MCP protocol.

### Task 3: Stdio entry point and combined configuration

**Prompt:** "Create minimal stdio entry point for modular MCP server and single project configuration `.mcp.json` for Context7 and pipeline-status. Use stdout only for MCP protocol; do not run HTTP."
**Files to CREATE/UPDATE:** `mcp/stdio.ts`, `.mcp.json`, `package.json`, `package-lock.json`, `tsconfig.json`
**Interfaces/Functions:** stdio process via `StdioServerTransport`; config server names `context7` and `pipeline-status`
**Details:** Add `@modelcontextprotocol/sdk` and `zod`; pipeline-status is started by the local Node.js/tsx command; default results path — `shared/results`; `.mcp.json` contains both required servers.
**Verification:** JSON parse `.mcp.json`, required server-name check, `npm run typecheck` and stdio smoke test complete successfully.

### Task 4: Research and project documentation

**Prompt:** "Document actual executed Context7 queries for TypeScript MCP SDK and Claude Code project MCP config. Update README with only validated commands and append-only log. Do not screenshot or claim that manual Claude interaction is already done."
**Files to CREATE/UPDATE:** `docs/research-notes.md`, `README.md`, `docs/log.md`
**Interfaces/Functions:** documentation contract for running MCP via Claude Code and secure response fields
**Details:** Specify library IDs `/modelcontextprotocol/typescript-sdk/v1.29.0` and `/websites/code_claude`, insight about stdio/registerTool/registerResource/InMemoryTransport and `.mcp.json`; fix user-approved choice of one Claude Code config file.
**Verification:** `rg` finds two server names, two tools, resource URIs, both library IDs and does not find unresolved placeholders.

## Definition of Done

- `.mcp.json` exists, is valid JSON and contains both required servers.
- `mcp/handlers.ts`, `mcp/server.ts` and `mcp/stdio.ts` implement read-only modular boundary.
- Both tools and resource return actual safe results without PII and audit trail.
- Unit/integration MCP tests are isolated from real `shared/` and pass.
- Full tests, coverage not lower than configured thresholds, typecheck and diff check pass.
- README, `docs/research-notes.md` and append-only `docs/log.md` updated with actual results.
- Screenshot is clearly left for the final manual submission stage.
- No unresolved placeholders, contradictions or unlabelled assumptions remain.