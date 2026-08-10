---
description: Перевірити sample transactions у dry-run режимі без fraud та compliance stages.
allowed-tools: Read, Grep, Glob, Bash(npm run validate:dry), Bash(node *)
---

Перевір усі records із `sample-transactions.json` через `/hw6-validate-transactions` без запуску повного pipeline.

Workflow:

1. Прочитай `AGENTS.md` і validation requirements у `docs/specification.md`.
2. Перевір, що `sample-transactions.json` існує та є valid JSON array.
3. Перевір `package.json` і наявність npm script `validate:dry`.
   - Якщо script відсутній, зупинись і повідом, що dry-run validator ще не реалізовано.
   - Не імітуй output вручну й не заявляй про успішну validation.
4. Запусти:

```bash
npm run validate:dry
```

5. Покажи:
   - total count;
   - valid count;
   - invalid count;
   - reason codes для кожної invalid transaction.
6. Виведи таблицю з колонками `transaction_id`, `status`, `reasons`.
7. Не запускай fraud detector або compliance checker і не змінюй `shared/results/`.
8. Не показуй account numbers, descriptions або інші PII.
9. Не виконуй `git add` або `git commit`.
