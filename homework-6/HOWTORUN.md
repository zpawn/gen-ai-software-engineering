# Як запустити Homework 6

Цей документ описує повний локальний запуск TypeScript pipeline, тестів, Fastify API, Claude Code команд і MCP servers.

Усі команди виконуй із кореня директорії `homework-6`, якщо не зазначено інше.

## 1. Передумови

Потрібні:

- Node.js 24 або новіший;
- npm;
- Claude Code — лише для запуску AI meta-agents, slash-команд і MCP demo.

Перевір версії:

```bash
node --version
npm --version
claude --version
```

Якщо потрібно запустити тільки TypeScript-застосунок і тести, Claude Code не обов'язковий.

## 2. Встановлення залежностей

```bash
npm install
```

Ця команда встановить Fastify, Decimal.js, TypeScript MCP SDK, Vitest та інші залежності з `package-lock.json`.

## 3. Запуск transaction pipeline

```bash
npm run pipeline
```

Pipeline:

1. читає `sample-transactions.json`;
2. послідовно передає кожну транзакцію через `transaction-validator`, `fraud-detector` і `compliance-checker`;
3. записує проміжні JSON messages у `shared/`;
4. записує final results у `shared/results/`;
5. створює `shared/results/summary.json`.

Для поточного sample очікується такий безпечний summary:

```text
total=8
approved=3
review=3
rejected=2
rejected=TXN006: UNSUPPORTED_CURRENCY
rejected=TXN007: NON_POSITIVE_AMOUNT
```

Перевір створені результати:

```bash
ls shared/results
```

Мають бути файли `TXN001.json`–`TXN008.json` і `summary.json`.

> Повний pipeline очищає runtime-вміст `shared/input`, `shared/processing`, `shared/output` і `shared/results` перед новим запуском. Не зберігай у цих директоріях власні файли.

## 4. Dry-run валідації

Щоб перевірити input без fraud та compliance stages і без зміни `shared/results/`, виконай:

```bash
npm run validate:dry
```

Очікуваний результат для поточного sample:

```text
total=8
valid=6
invalid=2
rejected=TXN006: UNSUPPORTED_CURRENCY
rejected=TXN007: NON_POSITIVE_AMOUNT
```

## 5. Перевірка коду

Запусти весь test suite:

```bash
npm test
```

Запусти тести зі звітом coverage:

```bash
npm run test:coverage
```

Проєкт вимагає щонайменше 80% для statements, branches, functions і lines. Ціль домашнього завдання — не менше 90% test coverage.

Перевір TypeScript types:

```bash
npm run typecheck
```

## 6. Запуск Fastify API

Перед запуском API спочатку створи актуальні results:

```bash
npm run pipeline
npm run api
```

За замовчуванням server працює на `http://127.0.0.1:3000`. Не закривай цей terminal, поки перевіряєш API.

В іншому terminal виконай:

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/summary
curl http://127.0.0.1:3000/transactions/TXN001
```

Основні endpoints:

| Method | Endpoint | Результат |
|---|---|---|
| `GET` | `/health` | Health status API |
| `GET` | `/summary` | Останній pipeline summary |
| `GET` | `/transactions/:transactionId` | Final result конкретної транзакції |

Зупини server через `Ctrl+C`.

Якщо порт `3000` зайнятий, задай інший:

```bash
PORT=3001 npm run api
```

## 7. Запуск через Claude Code

Запусти Claude Code з кореня репозиторію:

```bash
claude
```

Claude Code спочатку прочитає project instructions. Усередині інтерактивної Claude Code сесії доступні команди з префіксом `hw6`.

### Повний pipeline

```text
/hw6-run-pipeline
```

Команда запускає `npm run pipeline`, перевіряє results і показує лише безпечний summary без account numbers та інших PII.

### Dry-run validator

```text
/hw6-validate-transactions
```

Команда запускає лише validator, показує valid/invalid counts і не змінює `shared/results/`.

### Створення feature specification

```text
/hw6-write-spec назва-feature
```

Feature specification буде створена в `docs/specifications/<feature-slug>.md` на основі project template.

## 8. Підключення MCP у Claude Code

У корені репозиторію вже є один project-scoped файл `.mcp.json`. Він підключає:

- `context7` — пошук актуальної документації;
- `pipeline-status` — read-only доступ до результатів pipeline.

Перед MCP demo створи результати:

```bash
npm run pipeline
```

Після цього запусти Claude Code:

```bash
claude
```

Під час першого запуску Claude Code попросить підтвердити project MCP servers із `.mcp.json`. Перевір configuration і дозволь `context7` та `pipeline-status` для цього проєкту.

Стан servers можна переглянути в Claude Code через `/mcp` або у звичайному terminal:

```bash
claude mcp get context7
claude mcp get pipeline-status
```

До підтвердження configuration може відображатися статус `Pending approval`.

### Приклади MCP-запитів у Claude Code

Отримати summary через custom MCP tool:

```text
Використай MCP tool list_pipeline_results і покажи останній pipeline summary.
```

Перевірити одну транзакцію:

```text
Використай MCP tool get_transaction_status для transaction_id TXN002.
```

Прочитати MCP resource:

```text
Прочитай MCP resource pipeline://summary.
```

Перевірити Context7:

```text
Використай Context7, щоб знайти актуальну документацію Fastify про створення GET route у TypeScript.
```

Custom MCP server повертає лише безпечні поля: `transactionId`, `status`, `reasonCodes`, `riskScore` і `riskFlags`. Raw transaction, account data, `explanation` та `auditTrail` через MCP не повертаються.

## 9. Coverage hook у Claude Code

Project hook перевіряє Bash-команди Claude Code. Коли Claude Code намагається виконати `git push`, hook спочатку запускає:

```bash
npm run test:coverage
```

Якщо тести падають або будь-який configured coverage threshold нижчий за 80%, push блокується. Самостійно виконувати `git push` для звичайної перевірки проєкту не потрібно.

## 10. Типові проблеми

### `npm` повідомляє про несумісну версію Node.js

Перевір `node --version`. Проєкт вимагає Node.js 22 або новіший.

### API або MCP не знаходить summary

Спочатку виконай:

```bash
npm run pipeline
```

Потім повтори API або MCP-запит.

### MCP server має статус `Pending approval`

Запусти інтерактивний `claude` з кореня репозиторію та підтвердь project MCP configuration через запит Claude Code або `/mcp`.

### Порт API зайнятий

Запусти API на іншому порту:

```bash
PORT=3001 npm run api
```

### Потрібне повне перевстановлення dependencies

Не видаляй файли проєкту. Повторно виконай:

```bash
npm install
```
