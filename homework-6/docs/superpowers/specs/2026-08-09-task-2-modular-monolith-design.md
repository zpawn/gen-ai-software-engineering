# Design Task 2: modular TypeScript transaction pipeline

## Purpose and limits

Implement a runnable TypeScript application that sequentially processes all records from `sample-transactions.json` through validator, fraud detector and compliance checker, stores final results in `shared/results/` and provides read-only Fastify API for health, transaction status and summary.

Task 2 does not include the custom MCP server, screenshots, HOWTORUN, or the final configuration of the coverage hook — these are completed in Tasks 3–5. At the same time, the code is designed so that the MCP server in Task 4 reuses the read-only results repository without duplicating business logic.

## Selected architecture

The application is a modular monolith with three distinct layers:

1. **Domain:** types and pure deterministic pipeline agents without filesystem, HTTP or global state.
2. **Application/infrastructure:** integrator, file store, results repository and audit-safe logger.
3. **Delivery:** CLI entry points and read-only Fastify API.

```text
sample-transactions.json
          ↓
     runPipeline()
          ↓
shared/input/ → validator → shared/processing/
                                ↓
                         fraud detector
                                ↓
                         shared/output/
                                ↓
                       compliance checker
                                ↓
                         shared/results/
                                ↑
                  CLI + read-only Fastify API
```

Pipeline is independent of Fastify. The HTTP layer never starts or changes the pipeline, but only reads the already generated results.

## File structure

```text
src/
├── agents/
│   ├── transaction-validator.ts
│   ├── fraud-detector.ts
│   └── compliance-checker.ts
├── api/
│   ├── app.ts
│   └── server.ts
├── cli/
│   ├── run-pipeline.ts
│   └── validate-transactions.ts
├── config/
│   └── pipeline-config.ts
├── domain/
│   ├── transaction.ts
│   ├── pipeline-message.ts
│   └── pipeline-result.ts
├── infrastructure/
│   ├── audit-logger.ts
│   ├── file-store.ts
│   └── results-repository.ts
└── integrator.ts

tests/
├── unit/
│   ├── transaction-validator.test.ts
│   ├── fraud-detector.test.ts
│   └── compliance-checker.test.ts
├── integration/
│   └── pipeline.test.ts
└── api/
    └── app.test.ts
```

## Domain contracts

`RawTransaction` remains `unknown` until validation. After successful verification, `ValidTransaction` is created, where `amount` remains a decimal string, and currency is normalized to uppercase. `Decimal` instance is not included in serializable domain objects.

Agents return discriminated typed results:

- validator: `{ valid: true, transaction }` or `{ valid: false, transactionId, reasonCodes }`;
- fraud detector: `{ riskScore, riskFlags }`;
- compliance checker: `{ status: "approved" | "review", reasonCodes, explanation }`;
- integrator adds validation rejection as final `{ status: "rejected" }`.

`riskScore` is an integer from 0 to 100, not a monetary value. All amount parsing and threshold comparisons are performed via Decimal.js with string inputs; `number`, `parseFloat` and implicit coercion for money are prohibited.

## File protocol

For each input record integrator:

1. creates initial `PipelineMessage` in `shared/input/`;
2. the validator reads the input message;
3. invalid record is immediately atomically recorded in `shared/results/` as rejected;
4. valid record goes to `shared/processing/`;
5. fraud detector records assessment message in `shared/output/`;
6. the compliance checker records the final result in `shared/results/`;
7. the integrator forms `summary.json` from total/approved/review/rejected counts.

A successfully consumed stage file is deleted only after a successful atomic write of the next stage. Atomic write uses temporary sibling file and `rename`. Integrator clears only the four known stage directories in the configured shared root; extraneous paths are not deleted.

Result filenames are based on the safe transaction ID. Input index is stored separately so that summary counts records, and duplicate ID receives deterministic `DUPLICATE_TRANSACTION_ID` rejection without overwriting the previous result.

## Agent behavior

### Transaction validator

Checks object shape, required strings, unique transaction ID, strict ISO 8601 UTC timestamp, metadata country, decimal-string syntax, positive amount and configured currency allowlist. User-data errors do not throw exceptions and do not contain an input payload in the reason text.

### Fraud detector

Only accepts `ValidTransaction`. Adds +50 for amount strictly greater than configured `10000.00`, +25 for UTC hour 00–04 and +25 for country other than configured domestic country `US`. Returns a score bounded by 0–100 and stable risk flags.

### Compliance checker

Returns `review` if the score is greater than or equal to the configured threshold 50; otherwise `approved`. Explanation is formed from stable safe phrases and does not include accounts, description or raw payload.

## Audit and PII

Each stage adds `AuditEntry` with timestamp, agent name, transaction ID, outcome and reason codes. Clock is passed as a dependency so that the tests are deterministic. Console output and JSON result do not contain `source_account`, `destination_account`, description or full input object.

Raw account fields are only available to validator and pure downstream functions as part of an in-memory transaction. They do not get into the audit log, summary or Fastify responses.

## CLI

- `npm run pipeline` runs `src/cli/run-pipeline.ts`, clears configured stage directories, processes sample input and prints only safe summary.
- `npm run validate:dry` uses the same validator, but does not create `shared/` and does not call fraud/compliance stages.
- `npm run api` starts Fastify server on configurable host/port.
- User-facing Claude Code command is called `/hw6-run-pipeline` and delegates the launch to the verified npm command `npm run pipeline`; the old unprefixed `/run-pipeline` is not an active project command.

Record-level validation failures do not change the process exit code. Malformed top-level input JSON, unavailable input file, or inability to write stage/result are system errors and terminate the CLI with a non-zero exit code.

## Read-only Fastify API

Fastify app is created factory function `buildApp(options)` separately from `listen()` so that routes are tested through `app.inject()` without network port.

- `GET /health` → `200` and `{ "status": "ok" }`;
- `GET /transactions/:transactionId` → safe final result or `404 TRANSACTION_NOT_FOUND`;
- `GET /summary` → latest summary or `404 SUMMARY_NOT_FOUND` before the first run.

The API reads the configurable results directory via `results-repository.ts`. Malformed result files return controlled `500 RESULTS_READ_ERROR` without raw file content in response/logs.

## Dependencies and runtime

- Node.js `>=22`, ESM and TypeScript strict mode;
- Fastify 5 for read-only API;
- Decimal.js for exact monetary parsing/comparison;
- Vitest 4 and `@vitest/coverage-v8` for tests and coverage;
- `tsx` for development CLI execution;
- SQLite/Drizzle are not added, because the mandatory JSON protocol already ensures the persistence of this student scope.

## Testing strategy

The implementation follows TDD in the following order: validator → fraud detector → compliance checker → file store/integrator → dry-run CLI → Fastify API.

- unit tests check pure functions, boundaries and stable reason codes;
- integration test uses the OS temporary directory and its own sample fixture;
- API tests use Fastify `inject()` and temporary results directory;
- tests check the absence of plaintext account IDs and descriptions in captured output/results;
- V8 coverage includes `src/**/*.ts`, gate is set to 80%, actual target of Task 5 is at least 90%.

## Success criteria Task 2

1. `npm run pipeline` processes all 8 sample records without a system error.
2. `shared/results/` contains 8 final transaction results and `summary.json`.
3. TXN006 and TXN007 rejected; high-risk records receive a review according to the rules.
4. `npm run validate:dry` shows total/valid/invalid counts without creating stage files.
5. Fastify routes return health, transaction result and summary from actual result files.
6. Unit, integration and API tests are conducted in temporary directories.
7. Application output, audits and HTTP responses do not contain plaintext account IDs or descriptions.
8. Claude Code detects `/hw6-run-pipeline`, which executes the full pipeline and shows the safe summary and rejected reasons.

## Git policy

AI does not do `git add` or `git commit`. After the verified stage, the student receives only the recommended Conventional Commit name.
