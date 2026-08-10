# Дизайн Task 4: модульний MCP-шар

## Мета й межі

Task 4 додає read-only інтеграцію між Claude Code та вже створеними JSON results. MCP server не є новим pipeline agent, не виконує банківських рішень і не запускає pipeline. Він лише читає validated files через existing results repository та повертає мінімальну безпечну проєкцію.

Канонічні feature requirements описані в `docs/specifications/task-4-mcp-integration.md`.

## Обраний підхід

Використовується модульний TypeScript MCP layer із трьох компонентів:

```text
Claude Code
    │ stdio MCP
    ▼
mcp/stdio.ts
    │ creates/connects
    ▼
mcp/server.ts
    │ delegates
    ▼
mcp/handlers.ts
    │ reuses
    ▼
src/infrastructure/results-repository.ts
    │ reads
    ▼
shared/results/*.json
```

- `handlers.ts` не залежить від MCP SDK і містить safe projection та summary formatting.
- `server.ts` реєструє protocol-facing tools/resource і перетворює domain errors на безпечні MCP responses.
- `stdio.ts` є мінімальним process entry point без business logic.

Відхилено single-file server через змішування filesystem, security projection і protocol concerns. Відхилено Fastify bridge, оскільки local stdio integration не потребує HTTP.

## MCP contract

### `get_transaction_status`

Input:

```json
{ "transaction_id": "TXN001" }
```

Output містить тільки:

```json
{
  "transactionId": "TXN001",
  "status": "approved",
  "reasonCodes": [],
  "riskScore": 0,
  "riskFlags": []
}
```

Optional risk fields пропускаються, якщо їх немає у final result. `explanation`, `auditTrail` та raw data ніколи не входять до MCP response.

### `list_pipeline_results`

Повертає validated content `summary.json`:

```json
{ "total": 8, "approved": 3, "review": 3, "rejected": 2 }
```

### `pipeline://summary`

Static text resource повертає deterministic human-readable summary з тими самими чотирма counters і MIME type `text/plain`.

## Конфігурація

Формулювання Homework 6 називає файл `mcp.json`, але актуальний Claude Code автоматично завантажує project servers із `.mcp.json`. Студент обрав один робочий `.mcp.json` для фактичного Claude Code workflow; duplicate config не створюється.

- `context7`: `npx -y @upstash/context7-mcp@latest`.
- `pipeline-status`: local Node process із TypeScript entry point `mcp/stdio.ts` через installed `tsx` loader.
- `RESULTS_DIR`: `shared/results` за замовчуванням і configurable environment override.

Claude Code попросить користувача окремо approve-нути project MCP server при першому виявленні `.mcp.json`.

## Помилки й безпека

Existing `results-repository.ts` залишається єдиним місцем path validation та JSON shape validation. MCP handlers не читають files напряму.

Tool failures повертають `isError: true` і стабільний safe message. Resource failure використовує protocol error без absolute path або malformed content. Unsafe transaction ID має той самий зовнішній результат, що й absent ID, щоб не розкривати filesystem details.

Server не реєструє write operations. stdout stdio process зарезервований для MCP JSON-RPC; diagnostics, якщо будуть потрібні, спрямовуються тільки в stderr.

## Тестування

1. Handlers тестуються через temporary directory: safe projection, summary text, missing/malformed input і відсутність PII.
2. Server тестується SDK `Client` та `InMemoryTransport`: list/call tools, list/read resource, schema validation і controlled errors.
3. Config verification перевіряє valid JSON і required server names у `.mcp.json`.
4. Stdio smoke підтверджує protocol startup без HTTP і без writes до `shared/`.
5. Фінальний gate: full tests, coverage, typecheck, diff check і PII scan MCP output.

Скриншот Claude interaction не входить до implementation slice: студент зробить його разом з іншими submission screenshots наприкінці.
