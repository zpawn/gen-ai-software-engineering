# REST-Configurable File Pipeline Design

**Status:** approved by the student on 2026-08-12  
**Feature:** `rest-configurable-pipeline`

## Goal

Extend the existing Homework 6 system with a new deterministic `pipeline-configurator` TypeScript pipeline agent, allow all three existing steps to run in any requested order, expose transaction submission through one Fastify REST gateway, and provide an automatic `demo.sh`.

## Agreed Scope

- The configurable value is only step order. Fraud, validation, and compliance rules are unchanged.
- Every configuration contains `transaction-validator`, `fraud-detector`, and `compliance-checker` exactly once.
- One Fastify server wraps the existing file-based pipeline. Pipeline agents do not call one another over HTTP.
- REST uses a synchronous batch submission endpoint.
- The existing CLI remains supported with the canonical order.
- The Claude command asks only for step order and submits the repository sample data.

## Selected Architecture

```text
/hw6-configure-pipeline or demo.sh
                 |
                 v
          POST /pipeline/run
                 |
                 v
       pipeline-configurator
          validates steps
                 |
                 v
     runPipeline(PipelineOptions)
                 |
                 v
       closed step registry
                 |
                 v
 shared/input -> shared/processing -> shared/output -> shared/results
                 |
                 v
 GET /summary and GET /transactions/:transactionId
```

The shared directories represent ordinal positions in a three-step run. They are not tied to a specific pipeline agent. This lets the current file transitions remain useful when the order changes.

## Components

### Pipeline configurator

`configurePipeline(steps: unknown)` is a pure deterministic function. It accepts only an exact permutation of the three supported names, preserves the supplied order, and returns typed errors for all invalid input. A closed allowlist prevents dynamic code or module loading.

### Integrator and stage registry

`PipelineOptions` receives `steps`. It supports either the existing `inputFile` source or REST-provided `transactions`, but never both. The integrator selects handlers from a compile-time registry and executes every configured position sequentially.

Pipeline state may contain raw input, validated transaction, fraud assessment, final compliance decision, audit trail, and stage trace. Each handler reads only the state it requires and returns a new state plus an execution entry.

### Dependency behavior

- Validator requires the raw transaction.
- Fraud detector requires a validated transaction.
- Compliance checker requires a validated transaction and fraud assessment.

When state is missing, the step is recorded as `skipped` with a safe reason code. Later steps still run if their own requirements are present. Any dependency skip makes the final outcome `rejected` with `PIPELINE_DEPENDENCY_MISSING`. Existing validation failure reasons keep priority over dependency errors.

Examples:

```text
validator -> fraud -> compliance
completed    completed completed

fraud -> validator -> compliance
skipped  completed    skipped
final: rejected / PIPELINE_DEPENDENCY_MISSING
```

### REST gateway

`POST /pipeline/run` accepts:

```json
{
  "steps": [
    "fraud-detector",
    "transaction-validator",
    "compliance-checker"
  ],
  "transactions": []
}
```

The route validates configuration before clearing or writing stage directories, then calls the same integrator used by the CLI. It waits for completion and returns the summary plus safe result identifiers or links. Current health, summary, and transaction GET endpoints remain unchanged.

Because the current file store clears a shared workspace per run, the API permits only one active run. A second overlapping request receives `409 PIPELINE_BUSY`. Invalid steps receive `400 INVALID_PIPELINE_STEPS`, and unexpected failures receive a safe `500` response.

## File Protocol

For every transaction:

1. The initial envelope is written to `shared/input` and targets the first configured step.
2. The first execution output is moved to `shared/processing` and targets the second configured step.
3. The second execution output is moved to `shared/output` and targets the third configured step.
4. The third execution creates the final result in `shared/results`.

Skipped stages still create safe trace data, so the actual requested order can be proved. Stage output and final results do not contain plaintext account IDs, names, descriptions, or complete input payloads.

## CLI, AI Command, and Demo

`npm run pipeline` reads `sample-transactions.json` and supplies the canonical order. `/hw6-configure-pipeline` asks the user for an order, checks the answer, reads the same sample file, sends it to the REST endpoint, and displays safe results.

`demo.sh` starts the API, waits for `/health`, submits transactions, reads results, and stops the process through a cleanup trap. The default demonstration shows a canonical successful run and a non-logical run with dependency skips, with no prompts or manual server management.

## Testing Strategy

Implementation follows RED, GREEN, REFACTOR in this order:

1. configurator input contract;
2. registry-based integrator and stage traces;
3. REST submission and busy/error boundaries;
4. Claude command contract and shell demo;
5. documentation and full regression gate.

Integration and API tests use temporary directories. Fastify tests use `inject()` without a network listener. A fresh demo smoke test uses a local port and confirms cleanup. Full verification includes tests, coverage, typecheck, shell syntax, demo execution, and `git diff --check`.

## Alternatives Considered

### Direct agent calls behind one POST route

This is smaller, but it does not introduce an explicit configurable orchestration boundary and makes execution evidence harder to test.

### Generic plugin engine

This would support dynamic steps, but the challenge needs only three known steps. It would add unnecessary loading and security complexity.

### HTTP between pipeline agents

This was rejected after reviewing the challenge statement. The REST requirement is a gateway around the file-based pipeline, not a requirement for internal microservices.

## Out of Scope

Business-rule editing, optional or repeated steps, separate services, databases, queues, authentication, production concurrency, and cloud deployment are not part of this feature.
