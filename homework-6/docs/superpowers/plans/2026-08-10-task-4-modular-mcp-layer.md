# Task 4 Modular MCP Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Створити read-only модульний TypeScript MCP server і один project-scoped `.mcp.json`, через які Claude Code читає безпечні transaction statuses та pipeline summary.

**Architecture:** `mcp/handlers.ts` повторно використовує existing results repository та формує safe projections; `mcp/server.ts` реєструє protocol tools/resource; `mcp/stdio.ts` підключає `StdioServerTransport`. Claude Code запускає custom server і Context7 із єдиного `.mcp.json`.

**Tech Stack:** Node.js 22+, TypeScript strict mode, `@modelcontextprotocol/sdk` v1.30.x, Zod, Vitest, JSON files у `shared/results/`.

## Global Constraints

- Створити тільки `.mcp.json`; окремий `mcp.json` не створювати.
- MCP layer є read-only і не запускає pipeline.
- Не повертати raw transaction, account identifiers, names, descriptions, `explanation` або `auditTrail`.
- MCP tests використовують temporary directories та in-memory transport, а не real `shared/`.
- stdout stdio process зарезервований для MCP protocol.
- Не виконувати `git add`, `git commit` або `git push`.
- `docs/log.md` оновлювати лише append-only.

---

### Task 1: Safe handlers

**Files:**
- Create: `tests/mcp/handlers.test.ts`
- Create: `mcp/handlers.ts`

**Interfaces:**
- Consumes: `readTransactionResult(resultsDirectory, transactionId)` і `readPipelineSummary(resultsDirectory)` із `src/infrastructure/results-repository.ts`.
- Produces: `SafeTransactionStatus`, `getTransactionStatus`, `listPipelineResults`, `getPipelineSummaryResource`.

- [x] **Step 1: Написати failing handler tests**

Tests створюють temporary `results/`, записують valid result із private markers і перевіряють exact safe projection:

```ts
expect(await getTransactionStatus(resultsDirectory, "TXN001")).toEqual({
  transactionId: "TXN001",
  status: "review",
  reasonCodes: ["HIGH_VALUE"],
  riskScore: 50,
  riskFlags: ["HIGH_VALUE"],
});
```

Окремо перевірити result без optional risk fields, exact summary object, exact text `Pipeline summary: total=3, approved=1, review=1, rejected=1.` і безпечні repository errors.

- [x] **Step 2: Запустити RED**

Run: `npm test -- tests/mcp/handlers.test.ts`  
Expected: FAIL, тому що `mcp/handlers.ts` не існує.

- [x] **Step 3: Реалізувати мінімальні handlers**

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

- [x] **Step 4: Запустити GREEN**

Run: `npm test -- tests/mcp/handlers.test.ts`  
Expected: handler tests PASS.

### Task 2: MCP protocol registration

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `tests/mcp/server.test.ts`
- Create: `mcp/server.ts`

**Interfaces:**
- Consumes: Task 1 handlers і `ResultsRepositoryError` codes.
- Produces: `createPipelineStatusServer(options: { resultsDirectory: string }): McpServer`.

- [x] **Step 1: Встановити documented dependencies**

Run: `npm install @modelcontextprotocol/sdk@1.30.0 zod`  
Expected: dependencies додані до package files; існуючі tests не ламаються.

- [x] **Step 2: Написати failing protocol tests**

Через SDK `Client` і `InMemoryTransport.createLinkedPair()` перевірити:

```ts
expect((await client.listTools()).tools.map(({ name }) => name)).toEqual([
  "get_transaction_status",
  "list_pipeline_results",
]);
```

Також викликати обидва tools, прочитати `pipeline://summary`, перевірити Zod rejection для missing `transaction_id`, safe `isError: true` для absent result і відсутність private markers у serialized responses.

- [x] **Step 3: Запустити RED**

Run: `npm test -- tests/mcp/server.test.ts`  
Expected: FAIL, тому що `mcp/server.ts` не існує.

- [x] **Step 4: Реалізувати server factory**

Зареєструвати:

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

Tool callbacks повертають JSON text content; known repository errors мапляться на generic safe messages і `isError: true`.

- [x] **Step 5: Запустити GREEN**

Run: `npm test -- tests/mcp/server.test.ts`  
Expected: protocol tests PASS.

### Task 3: Stdio entry point і Claude Code configuration

**Files:**
- Create: `mcp/stdio.ts`
- Create: `.mcp.json`
- Create: `tests/mcp/config.test.ts`
- Modify: `tsconfig.json`

**Interfaces:**
- Consumes: `createPipelineStatusServer`.
- Produces: runnable stdio process і project MCP servers `context7`, `pipeline-status`.

- [x] **Step 1: Написати failing config test**

Test читає `.mcp.json` і перевіряє exact server names, Context7 command, local pipeline command, `RESULTS_DIR`, а також inclusion `mcp/**/*.ts` у TypeScript config.

- [x] **Step 2: Запустити RED**

Run: `npm test -- tests/mcp/config.test.ts`  
Expected: FAIL, тому що `.mcp.json` і `mcp/stdio.ts` не існують.

- [x] **Step 3: Реалізувати stdio/config**

`mcp/stdio.ts`:

```ts
const resultsDirectory = resolve(process.env.RESULTS_DIR ?? "shared/results");
const server = createPipelineStatusServer({ resultsDirectory });
await server.connect(new StdioServerTransport());
```

`.mcp.json` містить:

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

`tsconfig.json` включає `mcp/**/*.ts`.

- [x] **Step 4: Запустити GREEN і smoke**

Run: `npm test -- tests/mcp/config.test.ts && npm run typecheck`  
Expected: config test і typecheck PASS.

Run: `claude mcp list`  
Expected: Claude Code бачить `context7` і `pipeline-status`; first-use approval може вимагати ручного підтвердження студента.

### Task 4: Documentation та final gate

**Files:**
- Modify: `README.md`
- Modify: `docs/research-notes.md`
- Modify: `docs/log.md`
- Modify: `docs/superpowers/plans/2026-08-10-task-4-modular-mcp-layer.md`

**Interfaces:**
- Consumes: фактично перевірені commands, tools, resource та Context7 queries.
- Produces: точні інструкції для Claude Code й append-only implementation record.

- [x] **Step 1: Оновити README фактичним MCP workflow**

Описати один `.mcp.json`, first-use approval, restart Claude Code після config changes, два tools, resource і safe response boundary. Screenshot не позначати виконаним.

- [x] **Step 2: Оновити research/log**

Уточнити фактичне застосування Queries 15–17 та append implementation/verification entries в `docs/log.md` із реальними command results.

- [x] **Step 3: Запустити full verification**

Run:

```bash
npm test
npm run test:coverage
npm run typecheck
git diff --check
```

Expected: усі tests PASS, configured coverage thresholds виконані, typecheck і diff check мають exit code 0.

- [x] **Step 4: Перевірити security boundary**

Serialized MCP tool/resource outputs не містять `sourceAccount`, `destinationAccount`, `description`, `explanation`, `auditTrail` або private test markers.

- [x] **Step 5: Завершити без Git mutations**

Не stage-ити й не commit-ити. Запропонувати студенту commit title:

```text
feat: add Claude Code MCP pipeline status server
```
