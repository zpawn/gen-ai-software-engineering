# Task 4 MCP Integration Specification

> Ingest this specification, implement its Low-Level Tasks, and verify the resulting code against the High-Level and Mid-Level Objectives. Do not treat desired-state statements as evidence that implementation already exists.

**Feature slug:** `task-4-mcp-integration`  
**Status:** реалізовано й автоматично перевірено; interactive Claude approval та screenshot відкладено студенту  
**Last updated:** 2026-08-10

## High-Level Objective

Надати Claude Code read-only доступ до фактичних результатів transaction pipeline через модульний TypeScript MCP server і додати Context7 та pipeline-status до project MCP configuration.

## Mid-Level Objectives

1. Project MCP configuration у `.mcp.json` містить два stdio servers — `context7` і `pipeline-status` — та автоматично завантажується Claude Code з кореня Homework 6.
2. Tool `get_transaction_status(transaction_id: string)` читає один final result із configured `shared/results/` і повертає лише `transactionId`, `status`, `reasonCodes`, `riskScore` та `riskFlags`.
3. Tool `list_pipeline_results()` і resource `pipeline://summary` читають latest `summary.json` та повертають тільки `total`, `approved`, `review` і `rejected`.
4. Відсутні, malformed або небезпечні inputs завершуються контрольованою помилкою без витоку filesystem paths, raw JSON, account numbers, descriptions чи audit trail.
5. Handlers і MCP registration перевіряються ізольованими unit/integration tests; загальний coverage gate залишається не нижче 80%, а фактичний target — не нижче 90%.

## Implementation Notes

### Technical Constraints

- Runtime — Node.js 22+, language — TypeScript strict mode.
- Використати офіційний `@modelcontextprotocol/sdk` v1.30.x, `zod` для tool input schema та `StdioServerTransport` для local Claude Code integration.
- MCP layer є модульним: pure read-only handlers, MCP registration factory і окремий stdio entry point.
- Повторно використати `src/infrastructure/results-repository.ts`; не дублювати parsing і path-safety rules.
- Не додавати Fastify, SQLite, Drizzle, HTTP transport або write tools до MCP layer.

### Data and Interfaces

- `getTransactionStatus(resultsDirectory: string, transactionId: string): Promise<SafeTransactionStatus>` повертає safe projection без `explanation` та `auditTrail`.
- `listPipelineResults(resultsDirectory: string): Promise<PipelineSummary>` повертає validated content `summary.json`.
- `getPipelineSummaryResource(resultsDirectory: string): Promise<string>` формує deterministic text із чотирьох summary counters.
- `createPipelineStatusServer(options: { resultsDirectory: string }): McpServer` реєструє два tools і static resource URI `pipeline://summary`.
- `mcp/stdio.ts` визначає `RESULTS_DIR` із environment або використовує `shared/results` відносно project root, створює transport і підключає server.
- Tool content повертається як JSON text; resource content має MIME type `text/plain`.

### Security, Privacy and Audit

- MCP server має тільки read-only capabilities та не змінює `shared/`.
- Transaction status не містить raw transaction, account numbers, names, description, `explanation` або `auditTrail`.
- Summary не містить transaction-level data.
- Error content використовує лише стабільні безпечні повідомлення та коди; absolute paths, malformed file content і user-provided traversal input не повертаються.
- Окремий MCP audit log не додається: сервер не виконує фінансових рішень і лише читає вже аудитовані results.

### Error Handling and Reliability

- `TRANSACTION_NOT_FOUND` повертається як контрольований tool error для unknown/unsafe ID.
- `SUMMARY_NOT_FOUND` і `RESULTS_READ_ERROR` мапляться на безпечні MCP errors без внутрішніх details.
- Resource callback повертає protocol-safe error, якщо summary недоступний.
- stdout stdio process зарезервований для MCP protocol; startup diagnostics дозволені лише через stderr.
- Server не створює fallback або fabricated results.

### Performance

- Tool status виконує одне validated JSON file read; summary tool/resource виконують одне `summary.json` read.
- Directory scanning не потрібен, тому що canonical summary уже створюється pipeline.
- Це локальний студентський workflow; load testing і caching не потрібні.

### Testing and Verification

- TDD: handlers спочатку перевіряються failing tests у temporary results directory.
- MCP integration tests використовують SDK `InMemoryTransport` і `Client`, без network port і без реального `shared/`.
- Перевірити tool listing, valid/invalid tool calls, resource listing/read, safe projections і PII absence.
- Запустити `npm test`, `npm run test:coverage`, `npm run typecheck` і `git diff --check`.
- Виконати stdio smoke test або SDK client process test, не записуючи у pipeline results.

## Context

### Beginning Context

- Task 1–3 реалізовані; TypeScript pipeline створює validated results у `shared/results/`.
- `src/infrastructure/results-repository.ts` уже безпечно читає один transaction result і summary.
- `.mcp.json`, `mcp/` та MCP SDK dependencies відсутні.
- `docs/research-notes.md` уже містить Context7 research для pipeline й буде доповнений фактичними MCP SDK/Claude Code queries.

### Ending Context

- Існують `mcp/handlers.ts`, `mcp/server.ts`, `mcp/stdio.ts` та MCP tests.
- Існує `.mcp.json` із двома required servers; Claude Code автоматично завантажує її як project-scoped configuration.
- Єдиний `.mcp.json` містить `context7` і `pipeline-status`.
- Claude Code може викликати `get_transaction_status`, `list_pipeline_results` і читати `pipeline://summary` після user approval нового project MCP server.
- `docs/research-notes.md` містить точні Context7 library IDs, висновки та застосування.
- `docs/screenshots/mcp-interaction.png` залишається ручним deliverable фінального етапу за рішенням студента.

## Assumptions

- [ASSUMPTION] Формулювання Homework 6 називає файл `mcp.json`, але для робочого Claude Code кейсу студент свідомо обрав єдиний `.mcp.json`, який Claude Code автоматично читає.
- [ASSUMPTION] Claude Code запускається з кореня `homework-6`, тому relative path `shared/results` і `mcp/stdio.ts` резолвляться від кореня проєкту.
- [ASSUMPTION] У межах Task 4 screenshot створюється студентом наприкінці, як погоджено для всіх submission screenshots.

## Out of Scope

- Запуск або повторна обробка pipeline через MCP.
- Зміна, approve/reject або видалення transaction results.
- HTTP/SSE transport, authentication, remote deployment і multi-user access.
- Повернення full `PipelineResult`, raw transaction або audit trail.
- Створення screenshot у поточному implementation етапі.

## Low-Level Tasks

### Task 1: Safe MCP handlers

**Prompt:** "Прочитай `AGENTS.md`, project spec і цю feature spec. Через TDD створи read-only TypeScript handlers поверх existing results repository. Status handler має повертати тільки safe projection, summary handlers — тільки чотири counters. Не повертай explanation, auditTrail, filesystem paths або raw malformed content."  
**Files to CREATE/UPDATE:** `mcp/handlers.ts`, `tests/mcp/handlers.test.ts`  
**Interfaces/Functions:** `getTransactionStatus(resultsDirectory: string, transactionId: string): Promise<SafeTransactionStatus>`; `listPipelineResults(resultsDirectory: string): Promise<PipelineSummary>`; `getPipelineSummaryResource(resultsDirectory: string): Promise<string>`  
**Details:** Повторно використати `readTransactionResult` і `readPipelineSummary`; optional risk fields зберігати лише коли вони існують; errors не повинні включати unsafe input або path.  
**Verification:** `npm test -- tests/mcp/handlers.test.ts` завершується без failures і tests використовують лише temporary directory.

### Task 2: MCP server registration

**Prompt:** "Використай Context7 документацію актуальної v1.x гілки `@modelcontextprotocol/sdk`. Через TDD створи `McpServer` factory, зареєструй tools `get_transaction_status`, `list_pipeline_results` і static resource `pipeline://summary`, додай Zod input validation та безпечне mapping errors у MCP responses."  
**Files to CREATE/UPDATE:** `mcp/server.ts`, `tests/mcp/server.test.ts`  
**Interfaces/Functions:** `createPipelineStatusServer(options: PipelineStatusServerOptions): McpServer`  
**Details:** Integration tests використовують `InMemoryTransport.createLinkedPair()` і SDK `Client`; перевірити точні names, valid responses, invalid input, controlled missing-result error та resource content.  
**Verification:** `npm test -- tests/mcp/server.test.ts` проходить із tool/resource calls через in-memory MCP protocol.

### Task 3: Stdio entry point and combined configuration

**Prompt:** "Створи minimal stdio entry point для modular MCP server і єдину project configuration `.mcp.json` для Context7 та pipeline-status. stdout використовуй тільки для MCP protocol; не запускай HTTP."  
**Files to CREATE/UPDATE:** `mcp/stdio.ts`, `.mcp.json`, `package.json`, `package-lock.json`, `tsconfig.json`  
**Interfaces/Functions:** stdio process через `StdioServerTransport`; config server names `context7` і `pipeline-status`  
**Details:** Додати `@modelcontextprotocol/sdk` та `zod`; pipeline-status запускається локальним Node.js/tsx command; default results path — `shared/results`; `.mcp.json` містить обидва required servers.  
**Verification:** JSON parse `.mcp.json`, required server-name check, `npm run typecheck` і stdio smoke test завершуються успішно.

### Task 4: Research and project documentation

**Prompt:** "Задокументуй фактично виконані Context7 queries для TypeScript MCP SDK і Claude Code project MCP config. Онови README лише перевіреними командами й append-only журналом. Не створюй screenshot і не заявляй, що ручна Claude interaction уже виконана."  
**Files to CREATE/UPDATE:** `docs/research-notes.md`, `README.md`, `docs/log.md`  
**Interfaces/Functions:** documentation contract для запуску MCP через Claude Code та безпечних response fields  
**Details:** Вказати library IDs `/modelcontextprotocol/typescript-sdk/v1.29.0` і `/websites/code_claude`, insight про stdio/registerTool/registerResource/InMemoryTransport та `.mcp.json`; зафіксувати user-approved choice одного Claude Code config file.  
**Verification:** `rg` знаходить два server names, два tools, resource URI, обидва library IDs і не знаходить unresolved placeholders.

## Definition of Done

- `.mcp.json` існує, є valid JSON і містить обидва required servers.
- `mcp/handlers.ts`, `mcp/server.ts` і `mcp/stdio.ts` реалізують read-only modular boundary.
- Обидва tools і resource повертають фактичні safe results без PII та audit trail.
- Unit/integration MCP tests ізольовані від real `shared/` і проходять.
- Full tests, coverage не нижче configured thresholds, typecheck і diff check проходять.
- README, `docs/research-notes.md` і append-only `docs/log.md` оновлені фактичними результатами.
- Screenshot явно залишений для фінального ручного submission етапу.
- No unresolved placeholders, contradictions or unlabelled assumptions remain.
