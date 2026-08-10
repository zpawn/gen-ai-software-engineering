# Task 4 Modular MCP Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a read-only modular TypeScript MCP server and one project-scoped `.mcp.json` through which Claude Code reads secure transaction statuses and pipeline summary.

**Architecture:** `mcp/handlers.ts` reuses existing results repository and forms safe projections; `mcp/server.ts` registers protocol tools/resource; `mcp/stdio.ts` connects `StdioServerTransport`. Claude Code runs custom server and Context7 from a single `.mcp.json`.

**Tech Stack:** Node.js 22+, TypeScript strict mode, `@modelcontextprotocol/sdk` v1.30.x, Zod, Vitest, JSON files in `shared/results/`.

## Global Constraints

- Create only `.mcp.json`; do not create a separate `mcp.json`.
- MCP layer is read-only and does not start the pipeline.
- Do not return raw transaction, account identifiers, names, descriptions, `explanation` or `auditTrail`.
- MCP tests use temporary directories and in-memory transport, not real `shared/`.
- stdout stdio process is reserved for MCP protocol.
- Do not execute `git add`, `git commit` or `git push`.
- `docs/log.md` update only append-only.

---

### Task 1: Safe handlers

**Files:**
- Create: `tests/mcp/handlers.test.ts`
- Create: `mcp/handlers.ts`

**Interfaces:**
- Consumes: `readTransactionResult(resultsDirectory, transactionId)` and `readPipelineSummary(resultsDirectory)` with `src/infrastructure/results-repository.ts`.
- Produces: `SafeTransactionStatus`, `getTransactionStatus`, `listPipelineResults`, `getPipelineSummaryResource`.

- [x] **Step 1: Write failing handler tests**

Tests create temporary `results/`, record valid result with private markers and check exact safe projection:

```ts
expect(await getTransactionStatus(resultsDirectory, "TXN001")).toEqual({
  transactionId: "TXN001",
  status: "review",
  reasonCodes: ["HIGH_VALUE"],
  riskScore: 50,
  riskFlags: ["HIGH_VALUE"],
});
```

Separately check the result without optional risk fields, exact summary object, exact text `Pipeline summary: total=3, approved=1, review=1, rejected=1.` and safe repository errors.

- [x] **Step 2: Run RED**

Run: `npm test -- tests/mcp/handlers.test.ts`
Expected: FAIL because `mcp/handlers.ts` does not exist.

- [x] **Step 3: Implement minimal handlers**

```ts
export interface SafeTransactionStatus {
  transactionId: string;
  status: FinalStatus;
  reasonCodes: string[];
  riskScore?: number;
  riskFlags?: string[];
}

export const getTransactionStatus = async (
  resultsDirectory: string,
  transactionId: string,
): Promise<SafeTransactionStatus> => { /* safe projection */ };

export const listPipelineResults = (
  resultsDirectory: string,
): Promise<PipelineSummary> => readPipelineSummary(resultsDirectory);

export const getPipelineSummaryResource = async (
  resultsDirectory: string,
): Promise<string> => { /* deterministic counters */ };
```

- [x] **Step 4: Run GREEN**

Run: `npm test -- tests/mcp/handlers.test.ts`
Expected: handler tests PASS.

### Task 2: MCP protocol registration

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `tests/mcp/server.test.ts`
- Create: `mcp/server.ts`

**Interfaces:**
- Consumes: Task 1 handlers and `ResultsRepositoryError` codes.
- Produced by: `createPipelineStatusServer(options: { resultsDirectory: string }): McpServer`.

- [x] **Step 1: Install documented dependencies**

Run: `npm install @modelcontextprotocol/sdk@1.30.0 zod`
Expected: dependencies added to package files; existing tests do not break.

- [x] **Step 2: Write failing protocol tests**

Through SDK `Client` and `InMemoryTransport.createLinkedPair()` check:

```ts
expect((await client.listTools()).tools.map(({ name }) => name)).toEqual([
  "get_transaction_status",
  "list_pipeline_results",
]);
```

Also call both tools, read `pipeline://summary`, check Zod rejection for missing `transaction_id`, safe `isError: true` for absent result and lack of private markers in serialized responses.

- [x] **Step 3: Run RED**

Run: `npm test -- tests/mcp/server.test.ts`
Expected: FAIL because `mcp/server.ts` does not exist.

- [x] **Step 4: Implement server factory**

Register:

```ts
server.registerTool("get_transaction_status", {
  description: "Get a safe final transaction status.",
  inputSchema: { transaction_id: z.string().min(1) },
}, callback);

server.registerTool("list_pipeline_results", {
  description: "List the latest pipeline result counters.",
}, callback);

server.registerResource(
  "pipeline-summary",
  "pipeline://summary",
  { mimeType: "text/plain" },
  callback,
);
```

Tool callbacks return JSON text content; known repository errors are mapped to generic safe messages and `isError: true`.

- [x] **Step 5: Run GREEN**

Run: `npm test -- tests/mcp/server.test.ts`
Expected: protocol tests PASS.

### Task 3: Studio entry point and Claude Code configuration

**Files:**
- Create: `mcp/stdio.ts`
- Create: `.mcp.json`
- Create: `tests/mcp/config.test.ts`
- Modify: `tsconfig.json`

**Interfaces:**
- Consumes: `createPipelineStatusServer`.
- Produces: runnable stdio process and project MCP servers `context7`, `pipeline-status`.

- [x] **Step 1: Write failing config test**

Test reads `.mcp.json` and checks exact server names, Context7 command, local pipeline command, `RESULTS_DIR`, as well as inclusion of `mcp/**/*.ts` in TypeScript config.

- [x] **Step 2: Run RED**

Run: `npm test -- tests/mcp/config.test.ts`
Expected: FAIL because `.mcp.json` and `mcp/stdio.ts` do not exist.

- [x] **Step 3: Implement stdio/config**

`mcp/stdio.ts`:

```ts
const resultsDirectory = resolve(process.env.RESULTS_DIR ?? "shared/results");
const server = createPipelineStatusServer({ resultsDirectory });
await server.connect(new StdioServerTransport());
```

`.mcp.json` contains:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "pipeline-status": {
      "command": "node",
      "args": ["--import", "tsx", "mcp/stdio.ts"],
      "env": { "RESULTS_DIR": "shared/results" }
    }
  }
}
```

`tsconfig.json` includes `mcp/**/*.ts`.

- [x] **Step 4: Run GREEN and smoke**

Run: `npm test -- tests/mcp/config.test.ts && npm run typecheck`
Expected: config test and typecheck PASS.

Run: `claude mcp list`
Expected: Claude Code sees `context7` and `pipeline-status`; first-use approval may require manual confirmation by the student.

### Task 4: Documentation and final gate

**Files:**
- Modify: `README.md`
- Modify: `docs/research-notes.md`
- Modify: `docs/log.md`
- Modify: `docs/superpowers/plans/2026-08-10-task-4-modular-mcp-layer.md`

**Interfaces:**
- Consumes: actually tested commands, tools, resource and Context7 queries.
- Produces: exact instructions for Claude Code and append-only implementation record.

- [x] **Step 1: Update README with actual MCP workflow**

Describe one `.mcp.json`, first-use approval, restart Claude Code after config changes, two tools, resource and safe response boundary. Do not mark the screenshot as completed.

- [x] **Step 2: Update research/log**

Clarify the actual application of Queries 15–17 and append implementation/verification entries in `docs/log.md` with real command results.

- [x] **Step 3: Run full verification**

Run:

```bash
npm test
npm run test:coverage
npm run typecheck
git diff --check
```

Expected: all tests PASS, configured coverage thresholds are fulfilled, typecheck and diff check have exit code 0.

- [x] **Step 4: Check the security boundary**

Serialized MCP tool/resource outputs do not contain `sourceAccount`, `destinationAccount`, `description`, `explanation`, `auditTrail` or private test markers.

- [x] **Step 5: Finish without Git mutations**

Do not stage and do not commit. Offer the student a commit title:

```text
feat: add Claude Code MCP pipeline status server
```
