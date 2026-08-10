# Дизайн Task 2: модульний TypeScript transaction pipeline

## Мета та межі

Реалізувати runnable TypeScript-застосунок, який послідовно обробляє всі записи з `sample-transactions.json` через validator, fraud detector і compliance checker, зберігає фінальні результати у `shared/results/` та надає read-only Fastify API для health, transaction status і summary.

Task 2 не включає custom MCP server, screenshots, HOWTORUN або фінальне налаштування coverage hook — вони завершуються у Tasks 3–5. Водночас код проєктується так, щоб MCP server у Task 4 повторно використав read-only results repository без дублювання business logic.

## Обрана архітектура

Застосунок є модульним monolith із трьома чіткими шарами:

1. **Domain:** types і pure deterministic pipeline agents без filesystem, HTTP або global state.
2. **Application/infrastructure:** integrator, file store, results repository та audit-safe logger.
3. **Delivery:** CLI entry points і read-only Fastify API.

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

Pipeline не залежить від Fastify. HTTP layer ніколи не запускає та не змінює pipeline, а лише читає вже сформовані результати.

## Структура файлів

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

`RawTransaction` залишається `unknown` до validation. Після успішної перевірки створюється `ValidTransaction`, де `amount` залишається decimal string, а currency нормалізована до uppercase. `Decimal` instance не входить до serializable domain objects.

Agents повертають discriminated typed results:

- validator: `{ valid: true, transaction }` або `{ valid: false, transactionId, reasonCodes }`;
- fraud detector: `{ riskScore, riskFlags }`;
- compliance checker: `{ status: "approved" | "review", reasonCodes, explanation }`;
- integrator додає validation rejection як final `{ status: "rejected" }`.

`riskScore` є цілим числом 0–100, а не monetary value. Усі amount parsing і threshold comparisons виконуються через Decimal.js зі string inputs; `number`, `parseFloat` та implicit coercion для грошей заборонені.

## File protocol

Для кожного input record integrator:

1. створює initial `PipelineMessage` у `shared/input/`;
2. validator читає input message;
3. invalid record одразу atomically записується у `shared/results/` як rejected;
4. valid record переходить у `shared/processing/`;
5. fraud detector записує assessment message у `shared/output/`;
6. compliance checker записує final result у `shared/results/`;
7. integrator формує `summary.json` із total/approved/review/rejected counts.

Успішно спожитий stage file видаляється лише після успішного atomic write наступного stage. Atomic write використовує temporary sibling file та `rename`. Integrator очищає лише чотири відомі stage directories у configured shared root; сторонні paths не видаляються.

Result filenames базуються на safe transaction ID. Input index зберігається окремо, щоб summary рахував records, а duplicate ID отримував deterministic `DUPLICATE_TRANSACTION_ID` rejection без перезапису попереднього result.

## Agent behavior

### Transaction validator

Перевіряє object shape, required strings, unique transaction ID, strict ISO 8601 UTC timestamp, metadata country, decimal-string syntax, positive amount і configured currency allowlist. User-data errors не кидають exceptions і не містять input payload у reason text.

### Fraud detector

Приймає лише `ValidTransaction`. Додає +50 за amount строго більше configured `10000.00`, +25 за UTC hour 00–04 і +25 за country, відмінну від configured domestic country `US`. Повертає score, обмежений 0–100, і stable risk flags.

### Compliance checker

Повертає `review`, якщо score більший або дорівнює configured threshold 50; інакше `approved`. Explanation формується зі stable safe phrases й не включає accounts, description або raw payload.

## Audit і PII

Кожний stage додає `AuditEntry` із timestamp, agent name, transaction ID, outcome і reason codes. Clock передається як dependency, щоб tests були детермінованими. Console output і JSON result не містять `source_account`, `destination_account`, description або повний input object.

Raw account fields доступні лише validator та pure downstream functions як частина in-memory transaction. Вони не потрапляють у audit log, summary або Fastify responses.

## CLI

- `npm run pipeline` запускає `src/cli/run-pipeline.ts`, очищає configured stage directories, обробляє sample input і друкує лише safe summary.
- `npm run validate:dry` використовує той самий validator, але не створює `shared/` і не викликає fraud/compliance stages.
- `npm run api` запускає Fastify server на configurable host/port.
- User-facing Claude Code command має назву `/hw6-run-pipeline` і делегує запуск перевіреній npm-команді `npm run pipeline`; старий unprefixed `/run-pipeline` не є активним project command.

Record-level validation failures не змінюють process exit code. Malformed top-level input JSON, недоступний input file або неможливість записати stage/result є system errors і завершують CLI з non-zero exit code.

## Read-only Fastify API

Fastify app створюється factory function `buildApp(options)` окремо від `listen()`, щоб routes тестувалися через `app.inject()` без network port.

- `GET /health` → `200` і `{ "status": "ok" }`;
- `GET /transactions/:transactionId` → safe final result або `404 TRANSACTION_NOT_FOUND`;
- `GET /summary` → latest summary або `404 SUMMARY_NOT_FOUND` до першого run.

API читає configurable results directory через `results-repository.ts`. Malformed result files повертають controlled `500 RESULTS_READ_ERROR` без raw file content у response/logs.

## Dependencies та runtime

- Node.js `>=22`, ESM і TypeScript strict mode;
- Fastify 5 для read-only API;
- Decimal.js для exact monetary parsing/comparison;
- Vitest 4 та `@vitest/coverage-v8` для tests і coverage;
- `tsx` для development CLI execution;
- SQLite/Drizzle не додаються, бо обов’язковий JSON protocol уже забезпечує persistence цього student scope.

## Testing strategy

Реалізація йде TDD у такому порядку: validator → fraud detector → compliance checker → file store/integrator → dry-run CLI → Fastify API.

- unit tests перевіряють pure functions, boundaries і stable reason codes;
- integration test використовує OS temporary directory та власний sample fixture;
- API tests використовують Fastify `inject()` і temporary results directory;
- tests перевіряють відсутність plaintext account IDs та descriptions у captured output/results;
- V8 coverage включає `src/**/*.ts`, gate встановлюється на 80%, фактична ціль Task 5 — щонайменше 90%.

## Success criteria Task 2

1. `npm run pipeline` обробляє всі 8 sample records без system error.
2. `shared/results/` містить 8 final transaction results і `summary.json`.
3. TXN006 і TXN007 rejected; high-risk records отримують review згідно з rules.
4. `npm run validate:dry` показує total/valid/invalid counts без створення stage files.
5. Fastify routes повертають health, transaction result і summary з actual result files.
6. Unit, integration та API tests проходять у temporary directories.
7. Application output, audits і HTTP responses не містять plaintext account IDs або descriptions.
8. Claude Code виявляє `/hw6-run-pipeline`, яка виконує повний pipeline та показує safe summary і rejected reasons.

## Git policy

AI не виконує `git add` або `git commit`. Після перевіреного етапу студент отримує лише рекомендовану Conventional Commit назву.
