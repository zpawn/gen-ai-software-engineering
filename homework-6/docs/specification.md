# Technical specification: Multi-Agent Banking Transaction Pipeline

**Student:** ilia makarov
**Status:** implemented and verified
**Implementation language:** TypeScript

## 1. High-Level Objective / High-level objective

Create a TypeScript pipeline that consistently checks bank transactions, assesses fraud risk, makes compliance decisions and stores the traceable final result of each incoming transaction in `shared/results/`.

## 2. Mid-Level Objectives

1. **Validation:** each transaction is checked for mandatory fields, unique `transaction_id`, correct ISO 8601 timestamp, positive precise-decimal amount and supported ISO 4217 currency code.
2. **Fraud scoring:** each valid transaction receives a determined `risk_score` and `risk_flags` based on at least three factors: high value, unusual UTC time and cross-border feature; high-risk outcomes are sent for review.
3. **Compliance outcome:** compliance checker creates one final status — `approved`, `review` or `rejected` — and adds machine-readable reason codes and a clear text explanation.
4. **File-based protocol:** agents exchange standard JSON messages via `shared/input`, `shared/processing`, `shared/output`, `shared/results`; each transaction with `sample-transactions.json`, including the invalid one, has a final result.
5. **Auditability and quality:** all stage outcomes have ISO 8601 UTC audit entries without plaintext PII; pipeline generates summary report, unit/integration tests are isolated from real `shared/`, coverage target is at least 90%, and gate blocks action below 80%.

## 3. Implementation Notes

### 3.1. Technologies and boundaries

- Runtime: Node.js LTS.
- Language: TypeScript with `strict: true`.
- Application framework: Fastify for network/API or integration layer, if such a layer is needed.
- The main transaction pipeline is a CLI workflow and is launched via `npm run pipeline`; HTTP is not a prerequisite for processing.
- SQLite together with Drizzle ORM is added only if there is a specific need for durable history or metadata. A database does not replace the required JSON results.
- MCP status server is implemented in TypeScript and reads actual files from `shared/results/`.

### 3.2. Monetary values

- `amount` is stored and transmitted as a decimal string, for example `"1500.00"`.
- Precise decimal library is used for parsing, comparison and arithmetic.
- JavaScript `number`, `parseFloat` and binary floating-point arithmetic for money are prohibited.
- Negative or zero amount is a validation error, regardless of `transaction_type`; refund in sample data with a negative amount should be rejected.

### 3.3. Currencies

- Currency code is normalized to uppercase and checked against the explicit allowlist of supported ISO 4217 codes.
- The initial allowlist should at least include `USD`, `EUR`, `GBP`, `JPY`.
- `XYZ` from sample data is invalid currency and should end with `rejected` result.

### 3.4. Standard message envelope

Each stage reads and writes JSON in the following format:

```ts
interface PipelineMessage<TData> {
  message_id: string;
  timestamp: string;
  source_agent: string;
  target_agent: string;
  message_type: "transaction" | "pipeline_summary";
  data: TData;
}
```

Requirements:

- `message_id` is generated through `crypto.randomUUID()`;
- `timestamp` — ISO 8601 UTC;
- the output of the previous stage is the input of the next one;
- JSON is written atomically as much as it is practical for the local filesystem;
- malformed message does not drop without a trace, but creates a rejected result or an audit error with an available transaction identifier.

### 3.5. Fraud rules

Initial deterministic factors:

| Factor | Condition | Initial contribution |
|---|---|---:|
| High value | amount > 10,000 in transaction currency | +50 |
| Unusual time | UTC hour from 00:00 to 04:59 inclusive | +25 |
| Cross-border | transaction country does not match configured domestic country | +25 |

`risk_score` is limited to the range 0-100. Score from 50 inclusive leads to at least `review`; validation error always has priority and ends with `rejected`.

Cross-border rule depends on explicit configuration, for example domestic country `US`; the value must not be a hidden constant inside the business function.

### 3.6. Audit logging and PII

Audit entry contains:

```ts
interface AuditEntry {
  timestamp: string;
  agent_name: string;
  transaction_id: string;
  outcome: string;
  reason_codes: string[];
}
```

- Do not log `source_account`, `destination_account`, names or descriptions plaintext.
- If the account identifier is needed for diagnostics, use a redacted form like `ACC-****-1001` or an irreversible hash.
- Error messages should not duplicate the entire input payload.

### 3.7. File lifecycle

```text
sample-transactions.json
        ↓ integrator
shared/input/
        ↓ transaction-validator
shared/processing/
        ↓ fraud-detector
shared/output/
        ↓ compliance-checker
shared/results/
```

Integrator creates directories, but cleans only known pipeline directories. For one transaction, stages are executed sequentially. Async filesystem API is allowed, but dependent stages cannot be started before the previous one has completed.

## 4. Context / Context

### Beginning state

- At the root is `sample-transactions.json` with raw transaction records.
- TypeScript application code, package configuration, tests, `shared/` runtime data and MCP status server are missing at the beginning.
- Documentation and Claude Code scaffold can be created before application implementation.

### Ending state

- `npm run pipeline` completes without errors on the given sample input.
- All input transaction IDs are present in `shared/results/` exactly once as final outcomes.
- `shared/results/` contains pipeline summary with total, approved, review, rejected counts.
- `npm run validate:dry` shows total/valid/invalid counts and reasons without running fraud/compliance stages.
- Unit tests cover each pipeline agent; integration test covers the complete file flow in the temporary directory.
- Coverage is at least 90%; action/push gate refuses at coverage below 80%.
- README and HOWTORUN describe only the actually tested way of running.
- Custom MCP tools return status from actual `shared/results/`, and resource `pipeline://summary` returns latest summary text.

## 5. Low-Level Tasks / Low-level tasks

### Task: Transaction Integrator

**Prompt:** "Read `AGENTS.md`, `TASKS.md`, and `docs/specification.md`. Through TDD, create a TypeScript integrator that safely prepares `shared/input`, `shared/processing`, `shared/output`, `shared/results`, loads all records from `sample-transactions.json`, creates a standard PipelineMessage for each transaction, sequentially calls a validator, fraud detector, and compliance checker, guarantees a final result for each input ID, and creates a pipeline summary. Don't use HTTP as a CLI pipeline dependency, don't log PII, don't do git commit and update after changes `docs/log.md`."
**File to CREATE:** `src/integrator.ts`
**Function to CREATE:** `runPipeline(options: PipelineOptions): Promise<PipelineSummary>`
**Details:** Accepts configurable input/shared paths for test isolation; does not clear unknown directories; rejected validation result bypasses fraud/compliance, but gets into results; summary is counted from final files.

### Task: Transaction Validator

**Prompt:** "Read `AGENTS.md` and `docs/specification.md`. Create a pure TypeScript transaction validator through TDD. Check required fields, unique transaction ID within run context, ISO 8601 timestamp, positive precise-decimal amount and configured ISO 4217 allowlist. Return typed validation result with reason codes; do not throw raw errors due to incorrect user data, do not use JavaScript number for money and do not log PII."
**File to CREATE:** `src/agents/transaction-validator.ts`
**Function to CREATE:** `validateTransaction(transaction: unknown, context: ValidationContext): ValidationResult`
**Details:** Mandatory fields include transaction ID, timestamp, source/destination account, amount, currency, transaction type and metadata country. Invalid amount/currency create deterministic reason codes; dry-run CLI uses the same function.

### Task: Fraud Detector

**Prompt:** "Read `AGENTS.md` and `docs/specification.md`. Use TDD to create a pure deterministic fraud detector for a valid transaction. Calculate risk score 0-100 for configured high-value threshold, unusual UTC hours, and domestic/cross-border country. Return score and stable risk flags. Use precise decimal comparison, pass rules through FraudConfig and don't directly access the filesystem."
**File to CREATE:** `src/agents/fraud-detector.ts`
**Function to CREATE:** `assessFraudRisk(transaction: ValidTransaction, config: FraudConfig): FraudAssessment`
**Details:** Initial weights: high value +50, unusual time +25, cross-border +25; threshold and domestic country configurable; invalid transaction is not a valid input of this function.

### Task: Compliance Checker

**Prompt:** "Read `AGENTS.md` and `docs/specification.md`. Through TDD, create a pure compliance checker that accepts validated transaction and FraudAssessment, returns final `approved` or `review` outcome, reason codes and audit-safe explanation. Validation rejection is formed by validator/integrator path. Do not include account numbers, description or entire payload in result explanation or logs."
**File to CREATE:** `src/agents/compliance-checker.ts`
**Function to CREATE:** `checkCompliance(transaction: ValidTransaction, assessment: FraudAssessment, config: ComplianceConfig): ComplianceResult`
**Details:** Score from configured review threshold inclusively creates `review`; lower score — `approved`; output is serializable and contains transaction ID, risk data, status, reasons and audit entry.

### Task: Pipeline Status MCP Server

**Prompt:** "Read `AGENTS.md`, `TASKS.md` and `docs/specification.md`. Use the current Context7 TypeScript MCP SDK documentation. Create an MCP server that only reads `shared/results/` and provides tools `get_transaction_status(transaction_id: string)`, `list_pipeline_results()` and resource `pipeline://summary`. Treat missing result directory and malformed files as explicit typed errors, do not change pipeline results and do not log PII."
**File to CREATE:** `mcp/server.ts`
**Functions to CREATE:** `getTransactionStatus(transactionId: string): Promise<TransactionStatusResult>`; `listPipelineResults(): Promise<PipelineResultsSummary>`; `getPipelineSummaryResource(): Promise<string>`
**Details:** Runtime path configurable for tests; tool responses come only from actual result files; server configuration is added together with Context7 to project `mcp.json`.
