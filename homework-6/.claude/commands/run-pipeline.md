---
description: Запустити multi-agent banking pipeline end-to-end і показати summary та rejected transactions.
allowed-tools: Read, Grep, Glob, Bash(npm run pipeline), Bash(node *), Bash(find shared/* *), Bash(git status *)
---

Запусти multi-agent banking pipeline end-to-end.

Дотримуйся такого workflow:

1. Прочитай `AGENTS.md`, `README.md`, `docs/specification.md` і `HOWTORUN.md`, якщо він існує.
2. Перевір, що `sample-transactions.json` існує та є valid JSON array.
3. Перевір `package.json` і наявність npm script `pipeline`.
   - Якщо `package.json` або script відсутній, зупинись і чесно повідом: pipeline ще не реалізовано.
   - Не створюй результатів і не заявляй про успішний запуск.
4. Очисти тільки runtime-файли у відомих каталогах `shared/input`, `shared/processing`, `shared/output`, `shared/results` способом, визначеним application scripts.
   - Не видаляй сам каталог `shared/`.
   - Не використовуй broad recursive deletion.
   - Не торкайся інших шляхів.
5. Запусти:

```bash
npm run pipeline
```

6. Перевір, що кожен `transaction_id` із `sample-transactions.json` має final result у `shared/results/`.
7. Покажи summary: total, approved, review, rejected.
8. Покажи таблицю rejected transactions із transaction ID, reason codes і поясненням без PII.
9. Якщо command завершився з помилкою або results неповні, повідом фактичну помилку; не називай run успішним.
10. Не виконуй `git add` або `git commit`.

