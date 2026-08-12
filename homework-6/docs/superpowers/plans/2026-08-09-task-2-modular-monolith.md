# Task 2 Modular Monolith Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable TypeScript transaction pipeline with three deterministic agents, JSON file protocol, CLI entry points and read-only Fastify API.

**Architecture:** Domain agents are pure functions. `runPipeline()` sequentially orchestrates them through an injectable filesystem infrastructure; The CLI starts the application workflow, and the Fastify app only reads ready results. Each behavior is implemented through RED → GREEN → REFACTOR.

**Tech Stack:** Node.js >=22, TypeScript strict, ESM, Fastify 5, Decimal.js, Vitest 4, V8 coverage, tsx, npm.

## Global Constraints

- `amount` remains a string; monetary parsing/comparison only executes Decimal.js.
- Supported currencies: `USD`, `EUR`, `GBP`, `JPY`.
- Fraud rules: amount `> 10000.00` → +50; UTC hours 00–04 → +25; country != `US` → +25.
- Compliance review threshold: score `>= 50`.
- Validation rejection has priority over fraud/compliance.
- Console, audit, result and HTTP output do not contain account IDs, description or raw payload.
- Tests do not change the repository `shared/`; filesystem tests use OS temporary directories.
- Claude launch command: `/hw6-run-pipeline`; internal script: `npm run pipeline`.
- SQLite and Drizzle are not included in Task 2.
- AI does not perform `git add` or `git commit`; commit title is only offered after verification.

---

### Task 1: Project scaffold and domain contracts

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/domain/transaction.ts`
- Create: `src/domain/pipeline-message.ts`
- Create: `src/domain/pipeline-result.ts`
- Create: `src/config/pipeline-config.ts`

**Interfaces:**
- Produces: `RawTransaction`, `ValidTransaction`, `ValidationResult`, `FraudAssessment`, `ComplianceResult`, `PipelineResult`, `PipelineSummary`, `PipelineMessage<T>`, `PipelineConfig`, `DEFAULT_PIPELINE_CONFIG`.

- [x] Install runtime dependencies `fastify` and `decimal.js`, plus dev dependencies `typescript`, `tsx`, `vitest`, `@vitest/coverage-v8`, `@types/node`; commit exact versions to `package-lock.json`.
- [x] Configure scripts:

```json
{
  "type": "module",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "pipeline": "tsx src/cli/run-pipeline.ts",
    "validate:dry": "tsx src/cli/validate-transactions.ts",
    "api": "tsx src/api/server.ts"
  }
}
```

- [x] Configure strict TypeScript with `target: ES2022`, `module: ESNext`, `moduleResolution: Bundler`, `noUncheckedIndexedAccess: true`, `rootDir: "."` and Node/Vitest types.
- [x] Configure Vitest Node environment and V8 coverage over `src/**/*.ts`, excluding CLI/server entry files, with 80% lines/functions/branches/statements thresholds and text/html/lcov reporters.
- [x] Define serializable domain types. Required signatures:

```ts
export interface ValidTransaction {
  transactionId: string;
  timestamp: string;
  sourceAccount: string;
  destinationAccount: string;
  amount: string;
  currency: string;
  transactionType: string;
  country: string;
}

export type FinalStatus = "approved" | "review" | "rejected";

export interface PipelineConfig {
  supportedCurrencies: ReadonlySet<string>;
  domesticCountry: string;
  highValueThreshold: string;
  unusualHourStart: number;
  unusualHourEnd: number;
  highValueWeight: number;
  unusualTimeWeight: number;
  crossBorderWeight: number;
  reviewThreshold: number;
}
```

- [x] Run `npm run typecheck`; expected exit code 0 with no emitted files.

### Task 2: Transaction validator — RED/GREEN

**Files:**
- Create: `tests/unit/transaction-validator.test.ts`
- Create: `src/agents/transaction-validator.ts`

**Interfaces:**
- Consumes: `ValidTransaction`, `PipelineConfig`.
- Produces: `validateTransaction(transaction: unknown, context: ValidationContext): ValidationResult`.

- [x] Write RED tests for valid normalization, missing fields, malformed/non-UTC timestamps, malformed/zero/negative amount, unsupported currency and duplicate ID. Include sample-specific assertions that `XYZ` and `-100.00` reject.

```ts
const result = validateTransaction(rawTransaction, {
  seenTransactionIds: new Set<string>(),
  supportedCurrencies: new Set(["USD", "EUR", "GBP", "JPY"]),
  fallbackTransactionId: "UNKNOWN-0001",
});
expect(result).toEqual({ valid: false, transactionId: "TXN006", reasonCodes: ["UNSUPPORTED_CURRENCY"] });
```

- [x] Run `npm test -- tests/unit/transaction-validator.test.ts`; expected FAIL because module/function does not exist.
- [x] Implement shape guards, strict UTC timestamp round-trip validation, decimal-string syntax and guarded `new Decimal(value)`, positive comparison and duplicate tracking. Stable reason order follows field validation order.
- [x] Run the validator test; expected PASS with no warnings.
- [x] Refactor shared guards only if duplication is visible; rerun validator test and `npm run typecheck`.

### Task 3: Fraud detector — RED/GREEN

**Files:**
- Create: `tests/unit/fraud-detector.test.ts`
- Create: `src/agents/fraud-detector.ts`

**Interfaces:**
- Consumes: `ValidTransaction`, fraud subset of `PipelineConfig`.
- Produces: `assessFraudRisk(transaction: ValidTransaction, config: FraudConfig): FraudAssessment`.

- [x] Write RED tests for `10000.00` boundary (no high-value flag), `10000.01`, hours 00 and 04, hour 05 boundary, domestic/cross-border and capped combined score.

```ts
expect(assessFraudRisk(transaction({ amount: "10000.01" }), config)).toEqual({
  riskScore: 50,
  riskFlags: ["HIGH_VALUE"],
});
```

- [x] Run `npm test -- tests/unit/fraud-detector.test.ts`; expected FAIL because implementation is absent.
- [x] Implement Decimal.js `gt(config.highValueThreshold)`, UTC hour extraction and explicit country comparison; keep function filesystem-free.
- [x] Run fraud tests; expected PASS.
- [x] Rerun validator + fraud tests and typecheck after refactoring.

### Task 4: Compliance checker - RED/GREEN

**Files:**
- Create: `tests/unit/compliance-checker.test.ts`
- Create: `src/agents/compliance-checker.ts`

**Interfaces:**
- Consumes: `ValidTransaction`, `FraudAssessment`, `{ reviewThreshold: number }`.
- Produced by: `checkCompliance(transaction, assessment, config): ComplianceResult`.

- [x] Write RED tests for score 49 approved, score 50 review, stable reason codes and explanations that omit account IDs/description.
- [x] Run `npm test -- tests/unit/compliance-checker.test.ts`; expected FAIL because implementation is absent.
- [x] Implement deterministic approved/review mapping and safe explanation constants.
- [x] Run compliance tests; expected PASS, then run all three agent suites and typecheck.

### Task 5: Atomic file store, audit logger and results repository

**Files:**
- Create: `tests/unit/file-store.test.ts`
- Create: `tests/unit/results-repository.test.ts`
- Create: `src/infrastructure/file-store.ts`
- Create: `src/infrastructure/audit-logger.ts`
- Create: `src/infrastructure/results-repository.ts`

**Interfaces:**
- Produces: `createPipelineDirectories(root)`, `clearPipelineDirectories(root)`, `writeJsonAtomic(path, value)`, `readJson(path)`, `moveStageFile(source, destination, value)`, `readTransactionResult(resultsDir, id)`, `readPipelineSummary(resultsDir)`, `createAuditEntry(input)`.

- [x] Write RED tests in OS temporary directories for known-directory creation/cleanup, preservation of unknown siblings, atomic final filename, missing result, malformed JSON and safe audit fields.
- [x] Run the two infrastructure suites; expected FAIL because modules are absent.
- [x] Implement async `node:fs/promises` adapters. `writeJsonAtomic` writes a sibling `.tmp-<uuid>` file then renames it; cleanup targets only `input`, `processing`, `output`, `results`.
- [x] Implement repository errors with codes `TRANSACTION_NOT_FOUND`, `SUMMARY_NOT_FOUND`, `RESULTS_READ_ERROR`; error messages must not include raw file content.
- [x] Run infrastructure tests and typecheck; expected PASS.

### Task 6: Integrator and full file flow — RED/GREEN

**Files:**
- Create: `tests/integration/pipeline.test.ts`
- Create: `src/integrator.ts`

**Interfaces:**
- Consumes: agents, file store, audit logger, `PipelineConfig`.
- Produced by: `runPipeline(options: PipelineOptions): Promise<PipelineSummary>`.

```ts
export interface PipelineOptions {
  inputFile: string;
  sharedRoot: string;
  config: PipelineConfig;
  now?: () => string;
  createMessageId?: () => string;
}
```

- [x] Write RED integration test with fixture records covering approved, review, invalid currency and negative amount. Assert one result per input, exact summary counts, empty consumed stage directories and no plaintext accounts/descriptions in serialized results.
- [x] Add RED tests for malformed top-level JSON, duplicate transaction ID and injected write failure/system error.
- [x] Run `npm test -- tests/integration/pipeline.test.ts`; expected FAIL because `runPipeline` does not exist.
- [x] Implement sequential per-record orchestration and stage messages. Rejected validation bypasses fraud/compliance; valid records move input → processing → output → results.
- [x] Generate `summary.json` from final in-memory outcomes only after every record completes. Use fallback `UNKNOWN-<index>` and collision-safe result filenames.
- [x] Run integration test; expected PASS. Then run all tests and typecheck.

### Task 7: CLI entry points — RED/GREEN

**Files:**
- Create: `tests/unit/validate-transactions-cli.test.ts`
- Create: `src/cli/validate-transactions.ts`
- Create: `src/cli/run-pipeline.ts`

**Interfaces:**
- Produces: `validateTransactionsFile(options): Promise<DryRunSummary>` and process entry points.

- [x] Write RED tests for dry-run total/valid/invalid/reasons, no shared-directory creation, safe output and malformed input rejection.
- [x] Run dry-run suite; expected FAIL because function is absent.
- [x] Implement reusable dry-run function and guarded CLI main blocks; pipeline CLI resolves repository-root defaults and prints only counts plus rejected transaction IDs/reason codes.
- [x] Run CLI unit tests, typecheck, then `npm run validate:dry`; expected sample summary `total=8`, `valid=6`, `invalid=2`.

### Task 8: Read-only Fastify API — RED/GREEN

**Files:**
- Create: `tests/api/app.test.ts`
- Create: `src/api/app.ts`
- Create: `src/api/server.ts`

**Interfaces:**
- Produces: `buildApp(options: AppOptions): FastifyInstance` and server startup.

- [x] Write RED `app.inject()` tests for `/health`, found/missing transaction, found/missing summary and malformed result controlled error.
- [x] Run API suite; expected FAIL because app factory is absent.
- [x] Implement `buildApp({ resultsDirectory })` with typed params/replies and JSON schemas; routes only call results repository.
- [x] Implement `server.ts` with configurable `HOST`, `PORT`, `RESULTS_DIR`; startup failure logs only safe error metadata and sets non-zero exit code.
- [x] Run API suite and typecheck; expected PASS without opening a network port.

### Task 9: Claude command prefix and end-to-end smoke run

**Files:**
- Move: `.claude/commands/run-pipeline.md` → `.claude/commands/hw6-run-pipeline.md`
- Modify: `.claude/commands/hw6-run-pipeline.md`
- Modify: `README.md`
- Append: `docs/log.md`

**Interfaces:**
- Consumes: `npm run pipeline`, `npm run validate:dry`.
- Produces: Claude command `/hw6-run-pipeline`.

- [x] Rename command without staging and update prompt to verify sample input, run `npm run pipeline`, read safe summary and report rejected transaction IDs/reason codes. Do not expose PII.
- [x] Verify old `.claude/commands/run-pipeline.md` is absent and new prefixed command exists.
- [x] Run `npm run pipeline`; expected exit code 0, eight final transaction files plus `summary.json`, TXN006/TXN007 rejected and deterministic sample summary.
- [x] Run `npm run validate:dry`; expected total 8, valid 6, invalid 2, without modifying `shared/`.
- [x] Start Fastify on an available local port, verify `/health`, `/transactions/TXN001` and `/summary`, then stop it.
- [x] Update README current-state and command sections using only observed outputs; append implementation/verification entries to `docs/log.md`.

### Task 10: Final quality gate and review

**Files:**
- Verify: all Task 2 files.

**Interfaces:**
- Produces: reviewable Task 2 completion evidence.

- [x] Run `npm test`; expected all suites pass with no warnings.
- [x] Run `npm run test:coverage`; expected every configured threshold >=80% and actual aggregate target >=90% where practical.
- [x] Run `npm run typecheck`; expected exit code 0.
- [x] Run PII scan against generated `shared/results/` and captured CLI output for every sample account/description; expected no matches.
- [x] Run `git diff --check`, confirm staging is empty and no AI commit exists.
- [x] Obtain independent specification-compliance review and code-quality review; address findings and repeat affected checks.
- [x] Suggest Conventional Commit title without staging or committing.
