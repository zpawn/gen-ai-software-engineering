# REST-Configurable Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a configurable three-step TypeScript pipeline agent, a synchronous REST submission gateway around the existing file protocol, an interactive Claude command, and a zero-manual-step demo.

**Architecture:** A pure `pipeline-configurator` validates an exact permutation of the three supported steps. `runPipeline()` executes a closed handler registry in that order while the existing shared directories represent ordinal stage positions. One Fastify route accepts transactions and step order, then calls the same file-backed integrator used by the CLI.

**Tech Stack:** Node.js 22+, TypeScript strict mode, Fastify 5, Decimal.js, Vitest 4 with V8 coverage, JSON files in `shared/`, Bash and curl for the demo.

## Global Constraints

- Use the required terms `AI meta-agent` and `TypeScript pipeline agent` in documentation.
- The supported steps are exactly `transaction-validator`, `fraud-detector`, and `compliance-checker`; each appears once.
- The configurable value is order only. Do not make fraud, compliance, currency, or validation rules user-configurable.
- Keep one Fastify server. REST wraps the file-based pipeline; pipeline agents do not communicate over HTTP.
- Amount remains a decimal string and monetary operations continue to use Decimal.js.
- Never expose account IDs, names, descriptions, raw transactions, or internal paths in results, logs, shell output, or HTTP errors.
- Invalid configuration must be rejected before clearing or writing `shared/`.
- Tests use temporary directories and Fastify `inject()`; they do not modify repository `shared/`.
- Use Context7 before Fastify implementation and append the query, library ID, insight, and actual use to `docs/research-notes.md`.
- Preserve the canonical CLI behavior and coverage gate. Do not add a database, queue, Docker, or cloud service.
- Do not run `git add` or `git commit`; end each task with a review checkpoint and offer a Conventional Commit title only after verified stages.

---

## File Structure

### Create

- `src/domain/pipeline-step.ts` — supported step names, execution trace, and configuration result types.
- `src/agents/pipeline-configurator.ts` — pure exact-permutation validation.
- `tests/unit/pipeline-configurator.test.ts` — configurator contract tests.
- `.claude/commands/hw6-configure-pipeline.md` — interactive order prompt and REST workflow.
- `demo.sh` — automatic server lifecycle and two REST demonstrations.

### Modify

- `src/integrator.ts` — input-source validation, closed registry, ordinal file flow, skips, and stage trace.
- `src/domain/pipeline-result.ts` — safe `stageTrace` on final results.
- `src/cli/run-pipeline.ts` — canonical default step order.
- `src/api/app.ts` — `POST /pipeline/run`, injected pipeline runner, request/reply schemas, and run lock.
- `src/api/server.ts` — pass both shared root and results directory.
- `src/infrastructure/results-repository.ts` — validate safe stage traces and new reason codes.
- `tests/integration/pipeline.test.ts` — canonical regression, in-memory REST input, and non-logical orders.
- `tests/api/app.test.ts` — REST submission, validation, busy, and safe error tests.
- `tests/unit/results-repository.test.ts` — stage-trace validation and allowlist regression.
- `package.json` — optional `demo` script only; no new package dependency.
- `README.md`, `HOWTORUN.md`, `AGENTS.md` — current architecture, commands, agent list, and demo.
- `docs/research-notes.md`, `docs/log.md` — factual Context7 and implementation/verification records.

---

### Task 1: Pipeline Step Contract and Configurator — RED/GREEN

**Files:**
- Create: `src/domain/pipeline-step.ts`
- Create: `src/agents/pipeline-configurator.ts`
- Test: `tests/unit/pipeline-configurator.test.ts`

**Interfaces:**
- Consumes: untrusted `unknown` step configuration.
- Produces: `PIPELINE_STEPS`, `PipelineStep`, `StageExecution`, `PipelineConfigurationResult`, and `configurePipeline(steps: unknown)`.

- [ ] **Step 1: Write failing exact-permutation tests**

```ts
expect(configurePipeline([
  "fraud-detector",
  "transaction-validator",
  "compliance-checker",
])).toEqual({
  valid: true,
  steps: ["fraud-detector", "transaction-validator", "compliance-checker"],
});

expect(configurePipeline([
  "fraud-detector",
  "fraud-detector",
  "compliance-checker",
])).toEqual({ valid: false, code: "INVALID_PIPELINE_STEPS" });
```

Add separate cases for non-array, wrong length, missing step, duplicate, unknown name, and all six valid permutations.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- tests/unit/pipeline-configurator.test.ts`
Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Define the closed domain contract**

```ts
export const PIPELINE_STEPS = [
  "transaction-validator",
  "fraud-detector",
  "compliance-checker",
] as const;

export type PipelineStep = (typeof PIPELINE_STEPS)[number];

export interface StageExecution {
  step: PipelineStep;
  status: "completed" | "skipped";
  reasonCodes: string[];
}

export type PipelineConfigurationResult =
  | { valid: true; steps: readonly PipelineStep[] }
  | { valid: false; code: "INVALID_PIPELINE_STEPS" };
```

- [ ] **Step 4: Implement minimal pure validation**

Implement `configurePipeline(steps: unknown): PipelineConfigurationResult` using array length, string allowlist, and `Set` equality checks. Return a copied order. Do not mutate input, read files, import Fastify, or dynamically load modules.

- [ ] **Step 5: Confirm GREEN and type safety**

Run: `npm test -- tests/unit/pipeline-configurator.test.ts`
Expected: all configurator tests PASS.
Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 6: Review checkpoint**

Inspect `git diff -- src/domain/pipeline-step.ts src/agents/pipeline-configurator.ts tests/unit/pipeline-configurator.test.ts` and `git diff --check`. Do not stage or commit.

---

### Task 2: Registry-Based File Integrator — RED/GREEN

**Files:**
- Modify: `src/integrator.ts`
- Modify: `src/domain/pipeline-result.ts`
- Modify: `src/cli/run-pipeline.ts`
- Test: `tests/integration/pipeline.test.ts`

**Interfaces:**
- Consumes: `configurePipeline()`, existing pure business functions, `PipelineStep[]`, and exactly one of `inputFile` or `transactions`.
- Produces: updated `PipelineOptions`, sequential registry execution, `StageExecution[]`, canonical CLI defaults, and unchanged `Promise<PipelineSummary>` return type.

- [ ] **Step 1: Add RED tests for options and canonical compatibility**

Update the test helper to include:

```ts
steps: [
  "transaction-validator",
  "fraud-detector",
  "compliance-checker",
],
```

Add tests proving that in-memory `transactions` work without an input file, both/no input sources produce `PipelineSystemError`, invalid steps fail before a sentinel file in `shared/results` is cleared, and canonical order preserves existing summary/status behavior.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- tests/integration/pipeline.test.ts`
Expected: FAIL because `PipelineOptions` and integrator do not support steps or REST records.

- [ ] **Step 3: Add input and execution state types**

Use an exclusive union for input:

```ts
type PipelineInput =
  | { inputFile: string; transactions?: never }
  | { inputFile?: never; transactions: readonly unknown[] };

export type PipelineOptions = PipelineInput & {
  steps: readonly PipelineStep[];
  sharedRoot: string;
  config: PipelineConfig;
  now?: () => string;
  createMessageId?: () => string;
};
```

Add a per-record internal state containing raw record, canonical ID, optional validated transaction, optional fraud assessment, validation reason codes, audit trail, and `stageTrace`.

- [ ] **Step 4: Implement source validation before file cleanup**

Call `configurePipeline(options.steps)` and verify exactly one input source before `clearPipelineDirectories()`. Read and array-check `inputFile`, or copy `transactions`. Convert every unexpected failure to the existing `PipelineSystemError`; preserve a typed invalid-configuration error long enough for the API adapter to map it safely.

- [ ] **Step 5: Replace hard-coded calls with a closed registry**

Implement handlers with this dependency contract:

```ts
type StageHandler = (state: PipelineState) => PipelineState;

const stageHandlers: Record<PipelineStep, StageHandler> = {
  "transaction-validator": runValidationStage,
  "fraud-detector": runFraudStage,
  "compliance-checker": runComplianceStage,
};
```

Validator always reads raw input. Fraud skips with `MISSING_VALIDATED_TRANSACTION`. Compliance skips with `MISSING_VALIDATED_TRANSACTION` or `MISSING_FRAUD_ASSESSMENT`. Invalid validation causes downstream dependent steps to skip. Every configured position appends one `StageExecution`.

- [ ] **Step 6: Preserve ordinal file transitions**

Initial envelope targets `steps[0]` in `input`. After position 0, move to `processing` targeting `steps[1]`; after position 1, move to `output` targeting `steps[2]`; after position 2, move to the final result. A skipped stage still writes the next envelope. Final stage directories are empty after consumption.

- [ ] **Step 7: Create deterministic final results**

Add `stageTrace: StageExecution[]` to `PipelineResult`. If validation fails, use its existing rejection reason codes. Otherwise, if any dependency was skipped, use status `rejected`, reason `PIPELINE_DEPENDENCY_MISSING`, and explanation `Pipeline step dependencies were not satisfied.` Only use the compliance result when no dependency skip exists.

- [ ] **Step 8: Add RED/GREEN non-logical order tests**

Test at least:

```ts
steps: ["fraud-detector", "transaction-validator", "compliance-checker"]
```

Expected trace: fraud skipped, validator completed, compliance skipped; final rejected with `PIPELINE_DEPENDENCY_MISSING`.

Also test `validator -> compliance -> fraud`: validator and fraud complete, compliance skips, final rejected. Assert all intermediate envelope source/target names follow configured neighbors and serialized results contain no PII.

- [ ] **Step 9: Keep CLI defaults compatible**

Add canonical `steps` to `createDefaultPipelineOptions()`. Run `npm run pipeline`; expected summary remains `8/3/3/2` and TXN006/TXN007 retain original validation reasons.

- [ ] **Step 10: Verify Task 2**

Run: `npm test -- tests/integration/pipeline.test.ts tests/unit/validate-transactions-cli.test.ts`
Expected: PASS.
Run: `npm run typecheck` and `git diff --check`
Expected: exit 0. Do not stage or commit.

---

### Task 3: Safe Stored-Result Contract — RED/GREEN

**Files:**
- Modify: `src/infrastructure/results-repository.ts`
- Modify: `src/api/app.ts` result response schema only
- Test: `tests/unit/results-repository.test.ts`
- Test: `tests/api/app.test.ts`
- Test: `tests/mcp/handlers.test.ts`

**Interfaces:**
- Consumes: `PipelineResult.stageTrace` and new generated dependency reason codes.
- Produces: safe validation/projection of completed/skipped step traces without widening PII exposure.

- [ ] **Step 1: Write RED repository tests**

Add a valid result containing all three safe trace entries. Add adversarial results with unknown step, unknown trace status, private marker in reason codes, duplicate step, and incomplete trace. Expect controlled `RESULTS_READ_ERROR` for every invalid stored result.

- [ ] **Step 2: Run focused repository and MCP tests**

Run: `npm test -- tests/unit/results-repository.test.ts tests/mcp/handlers.test.ts`
Expected: FAIL because `stageTrace` and the new allowlisted codes are unsupported.

- [ ] **Step 3: Extend strict result validation**

Allow only the three `PipelineStep` values, `completed|skipped`, existing generated codes, `MISSING_VALIDATED_TRANSACTION`, `MISSING_FRAUD_ASSESSMENT`, and `PIPELINE_DEPENDENCY_MISSING`. Require a three-entry trace containing each step exactly once. Do not expose raw stored objects in errors.

- [ ] **Step 4: Update API result JSON schema and MCP safe projection decision**

Add `stageTrace` to the transaction GET schema. Keep MCP output unchanged unless its strict parser requires the new field; if exposed, project only `step`, `status`, and allowlisted `reasonCodes`.

- [ ] **Step 5: Verify safe round trip**

Run: `npm test -- tests/unit/results-repository.test.ts tests/api/app.test.ts tests/mcp/handlers.test.ts tests/mcp/server.test.ts`
Expected: PASS and private-marker assertions remain green.
Run: `npm run typecheck` and `git diff --check`
Expected: exit 0.

---

### Task 4: Fastify REST Submission Gateway — Context7 and TDD

**Files:**
- Modify: `src/api/app.ts`
- Modify: `src/api/server.ts`
- Modify: `tests/api/app.test.ts`
- Modify: `docs/research-notes.md`

**Interfaces:**
- Consumes: `runPipeline({ transactions, steps, sharedRoot, config })`, `configurePipeline()`, and existing GET repositories.
- Produces: `POST /pipeline/run`, injected `runPipeline` dependency, one-run lock, typed 200/400/409/500 replies.

- [ ] **Step 1: Query Context7 before Fastify changes**

Resolve the current Fastify library ID, then query one concept at a time for route body JSON Schema/typed replies and testing async POST routes with `inject()`. Append search text, exact library ID, insight, and actual planned use to `docs/research-notes.md` before implementation.

- [ ] **Step 2: Write RED REST tests**

Build the app with a temporary `sharedRoot` and injected runner. Test:

```ts
await app.inject({
  method: "POST",
  url: "/pipeline/run",
  payload: { steps: canonicalSteps, transactions: [transaction()] },
});
```

Assert 200 summary, exact runner options, 400 `INVALID_PIPELINE_STEPS` for duplicates/unknowns, 400 safe request-schema error for missing transactions, 500 `PIPELINE_SYSTEM_ERROR`, and no raw marker in any error body.

- [ ] **Step 3: Add RED busy-run test**

Inject a deferred first runner call, issue a second POST before resolving it, and expect `409` with `{ code: "PIPELINE_BUSY", message: "A pipeline run is already in progress." }`. Resolve the first call and confirm later requests are accepted.

- [ ] **Step 4: Implement injectable app dependencies**

Extend options:

```ts
export interface AppOptions {
  resultsDirectory: string;
  sharedRoot: string;
  config?: PipelineConfig;
  pipelineRunner?: typeof runPipeline;
}
```

Register a JSON-schema-validated `POST /pipeline/run`. Validate steps through `configurePipeline()` before calling the runner. Use a closure boolean with `try/finally` for the one-run lock. Return `{ summary }` on 200 and fixed safe errors for 400/409/500.

- [ ] **Step 5: Update server wiring**

Default `sharedRoot` to `resolve("shared")`, derive results from `join(sharedRoot, "results")` unless `RESULTS_DIR` is explicitly supplied, and pass both paths to `buildApp()`.

- [ ] **Step 6: Run API regression gate**

Run: `npm test -- tests/api/app.test.ts`
Expected: all POST and existing GET tests PASS without opening a port.
Run: `npm run typecheck` and `git diff --check`
Expected: exit 0.

---

### Task 5: Interactive Claude Command and Zero-Step Demo

**Files:**
- Create: `.claude/commands/hw6-configure-pipeline.md`
- Create: `demo.sh`
- Modify: `package.json`
- Test/verify: shell syntax and live local smoke run

**Interfaces:**
- Consumes: `sample-transactions.json`, `npm run api`, `/health`, `POST /pipeline/run`, `/summary`, and `/transactions/:transactionId`.
- Produces: `/hw6-configure-pipeline`, executable `./demo.sh`, and optional `npm run demo`.

- [ ] **Step 1: Write the Claude command contract**

Frontmatter permits only required reads and safe local commands. Instructions must ask the user for one ordering, reject invalid answers, verify/start the local API, send the sample JSON as `transactions`, and show only summary, transaction IDs, statuses, safe reason codes, and stage traces. It must forbid PII, `git add`, and `git commit`.

- [ ] **Step 2: Write `demo.sh` with automatic lifecycle**

Use `#!/usr/bin/env bash`, `set -euo pipefail`, configurable `PORT` defaulting to `3000`, a temporary log file, background `npm run api`, and `trap cleanup EXIT INT TERM`. Poll `/health` with a bounded retry loop. Use curl with `--fail-with-body` and JSON bodies built from `sample-transactions.json` without printing raw transactions.

- [ ] **Step 3: Demonstrate both orders**

First submit the canonical order and print its summary. Then submit `fraud-detector -> transaction-validator -> compliance-checker`, print its summary, and retrieve safe transaction status/stage trace. The script must exit non-zero if health, submission, retrieval, or server cleanup fails.

- [ ] **Step 4: Add npm entry and shell permissions**

Add `"demo": "./demo.sh"` to scripts without changing dependencies. Set the executable bit on `demo.sh`.

- [ ] **Step 5: Verify syntax and live behavior**

Run: `bash -n demo.sh`
Expected: exit 0.
Run: `./demo.sh`
Expected: server starts, canonical and non-logical results print, script exits 0, and no API process remains. Scan output for sample account IDs/descriptions; expected no matches.

---

### Task 6: Documentation, Full Verification, and Review

**Files:**
- Modify: `README.md`
- Modify: `HOWTORUN.md`
- Modify: `AGENTS.md`
- Modify: `docs/log.md`
- Verify: all feature files

**Interfaces:**
- Consumes: fresh observed CLI, REST, demo, test, and coverage results.
- Produces: B1+ English current-state documentation and factual append-only records.

- [ ] **Step 1: Update agent and architecture documentation**

Add `pipeline-configurator` to the TypeScript pipeline agent lists. Show REST as a gateway around `shared/`, document the canonical default order, arbitrary exact permutations, safe skipped dependencies, `POST /pipeline/run`, `/hw6-configure-pipeline`, and `./demo.sh`.

- [ ] **Step 2: Append factual implementation entries**

Append `implement`, `test`, `docs`, and later `verify` entries to `docs/log.md` only for changes and commands that actually occurred. Keep older entries unchanged.

- [ ] **Step 3: Run focused and full tests**

Run: `npm test`
Expected: all suites PASS.
Run: `npm run test:coverage`
Expected: every configured threshold is at least 80% and aggregate target remains at least 90% where practical.

- [ ] **Step 4: Run static and behavior checks**

Run: `npm run typecheck`, `bash -n demo.sh`, `./demo.sh`, and `git diff --check`
Expected: all exit 0. Confirm CLI canonical summary remains `total=8`, `approved=3`, `review=3`, `rejected=2`.

- [ ] **Step 5: Run PII and workspace checks**

Search captured CLI/demo output and generated result projections for every sample account ID and description; expected no matches. Run `git status --short`, verify the pre-existing `package-lock.json` change was not overwritten, and confirm staging is empty.

- [ ] **Step 6: Completion review**

Use `superpowers:requesting-code-review` and then `superpowers:verification-before-completion`. Address verified findings, repeat affected commands, append the final factual verification log entry, and suggest a Conventional Commit title without staging or committing.
