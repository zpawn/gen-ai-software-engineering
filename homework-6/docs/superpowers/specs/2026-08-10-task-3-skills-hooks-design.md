# Дизайн Task 3: Claude-команди та coverage hook

## Мета

Завершити мінімально необхідну інфраструктуру Task 3 без створення скриншотів: уніфікувати назви створених у проєкті Claude-команд за префіксом `hw6-` і підтвердити, що coverage hook блокує `git push`, коли `npm run test:coverage` завершується помилкою.

## Обсяг змін

- Залишити наявну команду `.claude/commands/hw6-run-pipeline.md` без зміни поведінки.
- Перейменувати `.claude/commands/validate-transactions.md` на `.claude/commands/hw6-validate-transactions.md`.
- Перейменувати `.claude/commands/write-spec.md` на `.claude/commands/hw6-write-spec.md`.
- Оновити посилання на старі назви команд у проєктній документації.
- Не додавати автоматизовані тести для shell hook у межах мінімального варіанта.
- Не створювати screenshots: студент зробить їх під час фінального етапу.

## Coverage gate

Наявний `.claude/hooks/coverage-gate.sh` залишається механізмом блокування push. Hook повинен:

1. Ігнорувати Bash-команди, що не містять `git push`.
2. Перед `git push` запускати `npm run test:coverage`.
3. Завершуватися ненульовим кодом і блокувати push, якщо тести або coverage threshold не пройшли.
4. Дозволяти push лише після успішного coverage run.

Поріг задається у `vitest.config.ts` і має бути не нижчим за обов’язкові 80%. Перевірка виконується вручну без реального push: hook отримує тестовий JSON через stdin.

## Перевірка

- Перевірити відсутність власних Claude-команд без префікса `hw6-`.
- Запустити hook із безпечною командою, що не є push, і перевірити код `0`.
- Запустити hook із тестовим значенням `git push`; він має виконати актуальний `npm run test:coverage` і завершитися успішно за поточного coverage.
- Перевірити `npm run typecheck`.
- Не виконувати `git add`, `git commit` або справжній `git push`.

## Поза обсягом

- Автоматизовані unit-тести самого shell hook.
- Навмисне зниження coverage для демонстрації блокування.
- Скриншоти `skill-run-pipeline.png` та `hook-trigger.png`.
- Зміни TypeScript pipeline або бізнес-логіки.
