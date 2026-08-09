# Технічна специфікація: Multi-Agent Banking Transaction Pipeline

**Студент:** ilia makarov  
**Статус:** початкова погоджена специфікація перед реалізацією  
**Мова реалізації:** TypeScript

## 1. High-Level Objective / Високорівнева мета

Створити TypeScript pipeline, який послідовно перевіряє банківські транзакції, оцінює fraud risk, виконує compliance-рішення та зберігає простежуваний фінальний результат кожної вхідної транзакції у `shared/results/`.

## 2. Mid-Level Objectives / Середньорівневі цілі

1. **Валідація:** кожна транзакція перевіряється на обов’язкові поля, унікальний `transaction_id`, коректний ISO 8601 timestamp, додатну precise-decimal суму та підтримуваний ISO 4217 currency code.
2. **Fraud scoring:** кожна валідна транзакція отримує детермінований `risk_score` і `risk_flags` щонайменше за трьома факторами: high value, unusual UTC time та cross-border ознака; high-risk outcomes спрямовуються на review.
3. **Compliance outcome:** compliance checker створює один фінальний status — `approved`, `review` або `rejected` — і додає машинозчитувані reason codes та зрозуміле текстове пояснення.
4. **File-based protocol:** agents обмінюються стандартними JSON messages через `shared/input`, `shared/processing`, `shared/output`, `shared/results`; кожна транзакція з `sample-transactions.json`, включно з невалідною, має фінальний result.
5. **Auditability and quality:** усі stage outcomes мають ISO 8601 UTC audit entries без plaintext PII; pipeline формує summary report, unit/integration tests ізолюються від реального `shared/`, coverage target становить щонайменше 90%, а gate блокує дію нижче 80%.

## 3. Implementation Notes / Нотатки реалізації

### 3.1. Технології та межі

- Runtime: Node.js LTS.
- Language: TypeScript із `strict: true`.
- Application framework: Fastify для network/API або integration layer, якщо такий layer потрібен.
- Основний transaction pipeline є CLI workflow і запускається через `npm run pipeline`; HTTP не є передумовою обробки.
- SQLite разом із Drizzle ORM додається лише за конкретної потреби в durable history або metadata. База не замінює обов’язкові JSON results.
- MCP status server реалізується на TypeScript і читає фактичні файли з `shared/results/`.

### 3.2. Грошові значення

- `amount` зберігається і передається як decimal string, наприклад `"1500.00"`.
- Для parsing, comparison та arithmetic використовується precise decimal library.
- JavaScript `number`, `parseFloat` і binary floating-point arithmetic для грошей заборонені.
- Negative або zero amount є validation error, незалежно від `transaction_type`; refund у sample data з від’ємною сумою має бути rejected.

### 3.3. Валюти

- Currency code нормалізується до uppercase і перевіряється за явним allowlist підтримуваних ISO 4217 codes.
- Початковий allowlist повинен щонайменше включати `USD`, `EUR`, `GBP`, `JPY`.
- `XYZ` із sample data є invalid currency і має завершитися `rejected` result.

### 3.4. Standard message envelope

Кожен stage читає і записує JSON у такому форматі:

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

Вимоги:

- `message_id` генерується через `crypto.randomUUID()`;
- `timestamp` — ISO 8601 UTC;
- output попереднього stage є input наступного;
- JSON записується atomically настільки, наскільки це практично для локального filesystem;
- malformed message не падає безслідно, а створює rejected result або audit error із доступним transaction identifier.

### 3.5. Fraud rules

Початкові детерміновані фактори:

| Фактор | Умова | Початковий внесок |
|---|---|---:|
| High value | amount > 10,000 у transaction currency | +50 |
| Unusual time | UTC hour від 00:00 до 04:59 включно | +25 |
| Cross-border | transaction country не відповідає configured domestic country | +25 |

`risk_score` обмежується діапазоном 0–100. Score від 50 включно призводить щонайменше до `review`; validation error завжди має пріоритет і завершується `rejected`.

Cross-border rule залежить від явної configuration, наприклад domestic country `US`; значення не повинно бути прихованою константою всередині business function.

### 3.6. Audit logging і PII

Audit entry містить:

```ts
interface AuditEntry {
  timestamp: string;
  agent_name: string;
  transaction_id: string;
  outcome: string;
  reason_codes: string[];
}
```

- Не логувати `source_account`, `destination_account`, names або descriptions plaintext.
- Якщо account identifier потрібен для diagnostics, використовувати redacted форму на кшталт `ACC-****-1001` або irreversible hash.
- Error messages не повинні дублювати весь input payload.

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

Integrator створює каталоги, але очищає лише відомі pipeline directories. Для однієї транзакції stages виконуються послідовно. Async filesystem API дозволений, проте не можна запускати dependent stages до завершення попереднього.

## 4. Context / Контекст

### Beginning state

- У корені є `sample-transactions.json` із сирими transaction records.
- TypeScript application code, package configuration, tests, `shared/` runtime data та MCP status server на початку відсутні.
- Документація й Claude Code scaffold можуть бути створені раніше за application implementation.

### Ending state

- `npm run pipeline` завершується без помилок на наданому sample input.
- Усі input transaction IDs присутні у `shared/results/` рівно один раз як final outcomes.
- `shared/results/` містить pipeline summary із total, approved, review, rejected counts.
- `npm run validate:dry` показує total/valid/invalid counts і причини без запуску fraud/compliance stages.
- Unit tests покривають кожен pipeline agent; integration test покриває повний file flow у temporary directory.
- Coverage становить не менше 90%; action/push gate відмовляє при coverage нижче 80%.
- README і HOWTORUN описують лише фактично перевірений спосіб запуску.
- Custom MCP tools повертають status із фактичних `shared/results/`, а resource `pipeline://summary` повертає latest summary text.

## 5. Low-Level Tasks / Низькорівневі завдання

### Task: Transaction Integrator

**Prompt:** "Прочитай `AGENTS.md`, `TASKS.md` і `docs/specification.md`. Через TDD створи TypeScript integrator, який безпечно готує `shared/input`, `shared/processing`, `shared/output`, `shared/results`, завантажує всі records із `sample-transactions.json`, створює standard PipelineMessage для кожної транзакції, послідовно викликає validator, fraud detector і compliance checker, гарантує final result для кожного input ID та створює pipeline summary. Не використовуй HTTP як залежність CLI pipeline, не логуй PII, не виконуй git commit і після змін онови `docs/log.md`."  
**File to CREATE:** `src/integrator.ts`  
**Function to CREATE:** `runPipeline(options: PipelineOptions): Promise<PipelineSummary>`  
**Details:** Приймає configurable input/shared paths для test isolation; не очищає невідомі каталоги; rejected validation result обходить fraud/compliance, але потрапляє в results; summary рахується з final files.

### Task: Transaction Validator

**Prompt:** "Прочитай `AGENTS.md` і `docs/specification.md`. Через TDD створи pure TypeScript transaction validator. Перевір required fields, unique transaction ID у межах run context, ISO 8601 timestamp, positive precise-decimal amount і configured ISO 4217 allowlist. Поверни typed validation result із reason codes; не кидай необроблені помилки через некоректний user data, не використовуй JavaScript number для money і не логуй PII."  
**File to CREATE:** `src/agents/transaction-validator.ts`  
**Function to CREATE:** `validateTransaction(transaction: unknown, context: ValidationContext): ValidationResult`  
**Details:** Обов’язкові поля включають transaction ID, timestamp, source/destination account, amount, currency, transaction type і metadata country. Invalid amount/currency створюють deterministic reason codes; dry-run CLI використовує ту саму function.

### Task: Fraud Detector

**Prompt:** "Прочитай `AGENTS.md` і `docs/specification.md`. Через TDD створи pure deterministic fraud detector для валідної транзакції. Обчисли risk score 0–100 за configured high-value threshold, unusual UTC hours і domestic/cross-border country. Поверни score та stable risk flags. Використовуй precise decimal comparison, передавай rules через FraudConfig і не звертайся безпосередньо до filesystem."  
**File to CREATE:** `src/agents/fraud-detector.ts`  
**Function to CREATE:** `assessFraudRisk(transaction: ValidTransaction, config: FraudConfig): FraudAssessment`  
**Details:** Початкові weights: high value +50, unusual time +25, cross-border +25; threshold та domestic country configurable; invalid transaction не є допустимим input цієї function.

### Task: Compliance Checker

**Prompt:** "Прочитай `AGENTS.md` і `docs/specification.md`. Через TDD створи pure compliance checker, який приймає validated transaction і FraudAssessment, повертає фінальний `approved` або `review` outcome, reason codes і audit-safe explanation. Validation rejection формується validator/integrator path. Не включай account numbers, description або весь payload у result explanation чи logs."  
**File to CREATE:** `src/agents/compliance-checker.ts`  
**Function to CREATE:** `checkCompliance(transaction: ValidTransaction, assessment: FraudAssessment, config: ComplianceConfig): ComplianceResult`  
**Details:** Score від configured review threshold включно створює `review`; нижчий score — `approved`; output є serializable та містить transaction ID, risk data, status, reasons і audit entry.

### Task: Pipeline Status MCP Server

**Prompt:** "Прочитай `AGENTS.md`, `TASKS.md` і `docs/specification.md`. Використай актуальну Context7 документацію TypeScript MCP SDK. Створи MCP server, що тільки читає `shared/results/` і надає tools `get_transaction_status(transaction_id: string)`, `list_pipeline_results()` та resource `pipeline://summary`. Обробляй missing result directory і malformed files явними typed errors, не змінюй pipeline results і не логуй PII."  
**File to CREATE:** `mcp/server.ts`  
**Functions to CREATE:** `getTransactionStatus(transactionId: string): Promise<TransactionStatusResult>`; `listPipelineResults(): Promise<PipelineResultsSummary>`; `getPipelineSummaryResource(): Promise<string>`  
**Details:** Runtime path configurable для tests; tool responses походять лише з actual result files; server configuration додається разом із Context7 до project `mcp.json`.

