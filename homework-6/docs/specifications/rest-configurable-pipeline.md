# REST-Configurable Pipeline Specification

> Ingest this specification, implement its Low-Level Tasks, and verify the resulting code against the High-Level and Mid-Level Objectives. Do not treat desired-state statements as evidence that implementation already exists.

**Feature slug:** `rest-configurable-pipeline`  
**Status:** approved for planning  
**Last updated:** 2026-08-12

## High-Level Objective

Add a deterministic TypeScript pipeline agent that configures the order of all existing pipeline steps, expose the file-based pipeline through a Fastify REST gateway, and provide one automatic demo script.

## Mid-Level Objectives

1. `pipeline-configurator` accepts exactly one occurrence of `transaction-validator`, `fraud-detector`, and `compliance-checker` in any order and rejects every other step list before processing begins.
2. `runPipeline()` executes the three TypeScript pipeline agents in the configured order and records completed and skipped stages without crashing when an earlier dependency is missing.
3. `POST /pipeline/run` synchronously accepts a step order and a transaction array, runs the existing file-backed protocol, and returns the final pipeline summary.
4. `/hw6-configure-pipeline` asks the user for the step order, submits `sample-transactions.json` through the REST gateway, and reports the summary and safe rejection details.
5. `demo.sh` starts the API, waits until it is healthy, submits test transactions, displays results, and stops the API without manual steps.

## Implementation Notes

### Technical Constraints

- Keep one Fastify server. The REST API is a gateway around the file-based pipeline; the three existing TypeScript pipeline agents do not call one another through HTTP.
- Keep the pure business functions in `src/agents/`. Add `pipeline-configurator` as a deterministic TypeScript pipeline agent without an LLM.
- Replace the hard-coded stage calls in `src/integrator.ts` with a closed registry keyed by `PipelineStep`. Dynamic module loading and user-provided code are prohibited.
- Extend `PipelineOptions` with `steps` and a REST input source while preserving the current file input for `npm run pipeline`.
- The default CLI order remains `transaction-validator`, `fraud-detector`, `compliance-checker`.
- Use Context7 before changing Fastify APIs and record the query and applied pattern in `docs/research-notes.md`.

### Data and Interfaces

```ts
export type PipelineStep =
  | "transaction-validator"
  | "fraud-detector"
  | "compliance-checker";

export interface PipelineRunRequest {
  steps: PipelineStep[];
  transactions: unknown[];
}

export interface StageExecution {
  step: PipelineStep;
  status: "completed" | "skipped";
  reasonCodes: string[];
}
```

- `PipelineOptions` contains `steps: readonly PipelineStep[]` and exactly one input source: `inputFile` for CLI use or `transactions` for REST use.
- A valid order contains all three supported steps exactly once. Missing steps, duplicates, unknown values, non-arrays, and wrong lengths are invalid.
- Directory position represents the stage number, not a fixed agent: initial message in `shared/input`, first stage output in `shared/processing`, second stage output in `shared/output`, and final outcome in `shared/results`.
- Each result records a safe stage trace so the configured order and every skipped stage can be demonstrated.
- Existing `GET /transactions/:transactionId`, `GET /summary`, and `GET /health` remain available.

### Security, Privacy and Audit

- REST request validation must not echo the raw transaction payload in an error.
- Console output, API errors, stage traces, results, and audit entries must not expose account identifiers, names, descriptions, or full input objects.
- Existing precise-decimal money handling, supported-currency validation, UTC timestamps, reason-code allowlists, and safe audit fields remain mandatory.
- The pipeline step registry accepts only the three compile-time supported names. It must never evaluate input as code or resolve a user-controlled module path.

### Error Handling and Reliability

- Invalid step configuration returns HTTP `400` with code `INVALID_PIPELINE_STEPS`; no pipeline directories are cleared and no transaction is processed.
- A stage whose required state is unavailable returns `skipped` with a specific safe reason code such as `MISSING_VALIDATED_TRANSACTION` or `MISSING_FRAUD_ASSESSMENT`.
- Processing continues through the remaining configured stages after a skipped stage.
- If any stage is skipped because of a missing dependency, the final transaction status is `rejected` with `PIPELINE_DEPENDENCY_MISSING`.
- Invalid transaction data still has priority and produces the existing validation rejection reason codes.
- Unexpected storage or execution failures return the existing safe system error boundary and HTTP `500` without internal paths or payloads.
- Because a run clears the four shared stage directories, overlapping `POST /pipeline/run` requests are rejected with HTTP `409 PIPELINE_BUSY`.
- `demo.sh` uses a cleanup trap so the API process is stopped on success, error, or interruption.

### Performance

- Transactions and stages remain sequential within one run to preserve deterministic dependencies and file transitions.
- The REST endpoint is synchronous and intended for the bounded homework demo dataset, not high-volume production traffic.

### Testing and Verification

- Follow TDD for the configurator, dynamic integrator, REST route, AI command contract, and demo script behavior.
- Tests use temporary shared directories and Fastify `inject()`; they do not modify repository `shared/`.
- Cover canonical order, at least two non-canonical orders, every invalid step-list category, skipped dependencies, validation rejection, safe REST errors, and concurrent-run rejection.
- Run `npm test`, `npm run test:coverage`, `npm run typecheck`, `bash -n demo.sh`, `./demo.sh`, and `git diff --check` before completion.
- Coverage must remain above the blocking 80% gate and should remain at least 90% overall.

## Context

### Beginning Context

- `src/integrator.ts` directly calls validator, fraud detector, and compliance checker in one fixed order.
- The four `shared/` directories implement the working JSON file protocol, and the CLI reads `sample-transactions.json`.
- The Fastify API exposes only health, summary, and transaction-result GET routes; it cannot submit a pipeline run.
- No `pipeline-configurator`, `/hw6-configure-pipeline`, or `demo.sh` exists.

### Ending Context

- `src/agents/pipeline-configurator.ts` validates one exact permutation of the three supported steps.
- The integrator accepts the approved order through `PipelineOptions`, executes it through a closed registry, and persists ordinal stage messages through `shared/`.
- `POST /pipeline/run` accepts REST transactions and the order, while existing GET routes retrieve the stored results.
- Non-logical orders are observable through safe skipped-stage traces and deterministic rejected outcomes.
- The default CLI behavior and current Homework 6 sample result remain compatible under the canonical order.
- `/hw6-configure-pipeline`, `demo.sh`, tests, README, HOWTORUN, research notes, and the append-only log document and verify the feature.

## Assumptions

- [ASSUMPTION] A synchronous batch endpoint is sufficient because the challenge requires a demonstration gateway, not a production job queue.
- [ASSUMPTION] `demo.sh` demonstrates both the canonical order and one non-logical order so reviewers can see successful processing and dependency handling in one command.
- [ASSUMPTION] The REST response contains a summary and safe per-transaction result links or identifiers; full results remain available from the existing GET endpoint.

## Out of Scope

- Separate HTTP services for individual TypeScript pipeline agents.
- User-configurable fraud, validation, or compliance business rules.
- Optional, repeated, dynamically loaded, or user-authored pipeline steps.
- Database, message queue, authentication, Docker, cloud deployment, or concurrent write support.
- Changes to the MCP tool contracts unless result-schema compatibility requires a focused update.

## Low-Level Tasks

### Task 1: Pipeline order contracts and configurator

**Prompt:** "Read `AGENTS.md`, `TASKS.md`, `README.md`, the approved REST-configurable design and plan, and this feature specification. Through TDD, add a deterministic `pipeline-configurator` TypeScript pipeline agent that accepts only an exact permutation of the three existing pipeline steps. Return typed safe errors for invalid lists and do not change business-rule configuration."  
**Files to CREATE/UPDATE:** `src/agents/pipeline-configurator.ts`, `src/domain/pipeline-step.ts`, `tests/unit/pipeline-configurator.test.ts`  
**Interfaces/Functions:** `configurePipeline(steps: unknown): PipelineConfigurationResult`; `PipelineStep`; `StageExecution`  
**Details:** Reject wrong type, wrong length, duplicates, missing names, and unknown names. Preserve the caller order. Do not read files or use HTTP in this pure function.  
**Verification:** `npm test -- tests/unit/pipeline-configurator.test.ts` passes all valid-permutation and invalid-input cases.

### Task 2: Dynamic file-based orchestration

**Prompt:** "Use TDD to refactor `runPipeline()` so `PipelineOptions.steps` controls a closed handler registry. Preserve file input for the CLI, accept in-memory records for REST, persist each ordinal stage through the existing shared directories, and create a safe skipped-stage trace and rejected result when dependencies are missing."  
**Files to CREATE/UPDATE:** `src/integrator.ts`, `src/domain/pipeline-result.ts`, `src/domain/pipeline-message.ts`, `tests/integration/pipeline.test.ts`  
**Interfaces/Functions:** `runPipeline(options: PipelineOptions): Promise<PipelineSummary>`; updated `PipelineOptions`; stage handler registry  
**Details:** Execute all three positions in the configured order. Validator requires raw input, fraud detector requires a validated transaction, and compliance checker requires a validated transaction and fraud assessment. Keep canonical-order behavior compatible and preserve PII controls.  
**Verification:** `npm test -- tests/integration/pipeline.test.ts` passes canonical, non-canonical, invalid-data, stage-trace, and temporary-filesystem cases.

### Task 3: REST submission gateway

**Prompt:** "Use current Fastify documentation from Context7 and TDD to add synchronous `POST /pipeline/run`. Validate the request, call the same file-based integrator with REST transactions and configured steps, return safe summary data, reject invalid order with 400, reject an overlapping run with 409, and preserve all current GET routes."  
**Files to CREATE/UPDATE:** `src/api/app.ts`, `src/api/server.ts`, `tests/api/app.test.ts`, `docs/research-notes.md`  
**Interfaces/Functions:** `POST /pipeline/run`; extended `buildApp()` dependencies/options; `PipelineRunRequest` and typed reply contracts  
**Details:** Use dependency injection so API tests use `app.inject()` and a temporary shared root. Do not start a port in tests or return raw request data in errors.  
**Verification:** `npm test -- tests/api/app.test.ts` passes successful submission, invalid configuration, system error, existing GET regression, and busy-run cases.

### Task 4: Interactive AI command and automatic demo

**Prompt:** "Create a project-prefixed Claude command that asks for the order of all three pipeline steps, validates the answer, submits `sample-transactions.json` through the REST gateway, and reports safe results. Create `demo.sh` that starts the API, waits for health, demonstrates canonical and non-logical orders, displays results, and always stops the server."  
**Files to CREATE/UPDATE:** `.claude/commands/hw6-configure-pipeline.md`, `demo.sh`, `package.json`, tests or shell checks required by the approved plan  
**Interfaces/Functions:** Claude command `/hw6-configure-pipeline`; executable `./demo.sh`  
**Details:** The Claude command asks only for order. The script has zero prompts, uses a configurable local port, avoids PII output, fails on HTTP errors, and uses `trap` for cleanup.  
**Verification:** `bash -n demo.sh` exits 0 and a fresh `./demo.sh` run starts the API, submits test transactions, prints both demonstrations, and exits 0 without leaving the server running.

### Task 5: Documentation and full quality gate

**Prompt:** "Update current-state documentation for the new TypeScript pipeline agent, configurable ordering, REST submission, safe skip behavior, and automatic demo. Append factual research and change-log entries, then run the complete verification gate and report only observed results."  
**Files to CREATE/UPDATE:** `README.md`, `HOWTORUN.md`, `AGENTS.md`, `docs/research-notes.md`, `docs/log.md`  
**Interfaces/Functions:** documented REST request/response examples and demo commands  
**Details:** Use B1+ English and the required terms `AI meta-agent` and `TypeScript pipeline agent`. Do not describe the feature as implemented before verification.  
**Verification:** `npm test`, `npm run test:coverage`, `npm run typecheck`, `bash -n demo.sh`, `./demo.sh`, and `git diff --check` all complete successfully; documentation matches fresh output.

## Definition of Done

- `docs/specifications/rest-configurable-pipeline.md` and the approved design and plan exist at canonical paths.
- All three steps run exactly once in the configured order, and invalid configurations are rejected before file cleanup or processing.
- REST submission writes and processes the same file-based stage protocol used by the CLI.
- Non-logical orders produce observable skipped stages and safe `PIPELINE_DEPENDENCY_MISSING` outcomes without crashes.
- `/hw6-configure-pipeline` asks for order, and `demo.sh` completes the full demonstration without manual steps.
- The canonical CLI pipeline remains compatible, all tests and typecheck pass, coverage remains above 80%, and documentation and log are updated.
- No unresolved placeholders, contradictions or unlabelled assumptions remain.
