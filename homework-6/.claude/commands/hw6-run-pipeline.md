---
description: Запустити pipeline end-to-end і показати лише безпечний summary та reason codes rejected transactions.
allowed-tools: Read, Grep, Glob, Bash(npm run pipeline), Bash(node *), Bash(git status *)
---

Запусти multi-agent banking pipeline end-to-end через `/hw6-run-pipeline`.

Дотримуйся такого workflow:

1. Прочитай `AGENTS.md`, `README.md`, `docs/specification.md` і `HOWTORUN.md`, якщо він існує.
2. Перевір, що `sample-transactions.json` існує та є valid JSON array.
3. Перевір `package.json` і наявність npm script `pipeline`.
   - Якщо `package.json` або script відсутній, зупинись і чесно повідом, що pipeline ще не реалізовано.
   - Не створюй результатів і не заявляй про успішний запуск.
4. Запусти application workflow:

```bash
npm run pipeline
```

5. Перевір, що кожен `transaction_id` із `sample-transactions.json` має один final result у `shared/results/`.
6. Прочитай із `shared/results/summary.json` лише `total`, `approved`, `review` і `rejected`.
7. Для rejected results прочитай і покажи лише `transactionId` та `reasonCodes`.
   - Ніколи не показуй account numbers, names, descriptions, raw payload, audit details або інші PII.
8. Якщо команда завершилась з помилкою, results неповні або summary відсутній, повідом фактичну безпечну помилку; не називай run успішним.
9. Не виконуй `git add` або `git commit`.
