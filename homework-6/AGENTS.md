# Головні інструкції для AI-інструментів

`AGENTS.md` є канонічним джерелом правил для Claude Code, Codex, Gemini та інших AI-інструментів, які працюють із Homework 6.

## Обов’язковий порядок читання

Перед будь-якою роботою:

1. Прочитай `AGENTS.md` повністю.
2. Прочитай `TASKS.md` як оригінальне джерело вимог.
3. Прочитай `README.md`, щоб зрозуміти два рівні агентів і поточний стан.
4. Прочитай `docs/specification.md`, якщо файл уже існує.
5. Переглянь останні записи командою `grep "^## \[" docs/log.md | tail -5`, якщо `docs/log.md` уже існує.
6. Для implementation task прочитай відповідний погоджений дизайн у `docs/superpowers/specs/` і план у `docs/superpowers/plans/`.

Не стверджуй, що компонент реалізовано або перевірено, доки це не підтверджено файлами та свіжим результатом відповідної команди.

## Канонічні шляхи документації

- Технічна специфікація: `docs/specification.md`.
- Специфікації окремих features: `docs/specifications/<feature-slug>.md`.
- Context7 research notes: `docs/research-notes.md`.
- Append-only журнал змін: `docs/log.md`.
- Погоджені дизайн-рішення Superpowers: `docs/superpowers/specs/`.
- Implementation plans Superpowers: `docs/superpowers/plans/`.
- Окремі ADR за потреби: `docs/decisions/`.
- Screenshots для здачі: `docs/screenshots/`.

Не створюй кореневі дублікати `specification.md`, `research-notes.md` або `log.md`.

Для кожної нової feature до implementation створи окрему spec через project skill `hw6-writing-feature-specifications` у `.claude/skills/hw6-writing-feature-specifications/`. Skill використовує bundled asset, адаптований із `homework-3/specification-TEMPLATE-example.md`. Загальна `docs/specification.md` залишається project-level context і не перезаписується feature workflow.

## Обов’язкова термінологія: два рівні агентів

Слово «агент» без уточнення є неоднозначним. Завжди використовуй одну з двох назв:

### AI meta-agent

Claude Code workflow, який допомагає створювати проєкт:

- `hw6-specification-agent` — специфікація;
- `hw6-code-generation-agent` — TypeScript implementation і Context7 research;
- `hw6-unit-test-agent` — тести та coverage;
- `hw6-documentation-agent` — README, HOWTORUN та інша документація.

### TypeScript pipeline agent

Детермінований runtime-модуль без LLM:

- `transaction-validator`;
- `fraud-detector`;
- `compliance-checker`.

AI meta-agents створюють і перевіряють систему. TypeScript pipeline agents обробляють транзакції. Claude Code може запустити pipeline, але не замінює його бізнес-логіку.

## Мова документації

Пиши проєктну документацію українською. Не перекладай її англійською і не створюй англомовні дублікати без прямої команди студента.

Імена файлів, API, identifiers, library names і стандартні технічні терміни можуть залишатися англійською.

## Запланований технологічний стек

- Runtime: Node.js LTS.
- Language: TypeScript у strict mode.
- Framework: Fastify.
- File protocol: JSON у `shared/`.
- Money: точна decimal library; не використовувати JavaScript `number` для monetary arithmetic.
- Database лише за доведеної потреби: SQLite.
- ORM лише разом із базою: Drizzle ORM.
- MCP server: TypeScript.
- Tests: TypeScript test runner із coverage target не менше 90% і blocking gate нижче 80%.

Fastify використовується для network/API або integration layer, якщо він потрібен. CLI transaction pipeline не повинен залежати від HTTP. SQLite/Drizzle не замінюють обов’язкові JSON-файли в `shared/`.

## Runtime protocol

Integrator повинен:

1. Створити `shared/input`, `shared/processing`, `shared/output`, `shared/results`.
2. Завантажити всі records із `sample-transactions.json`.
3. Загорнути кожну транзакцію у стандартний JSON message envelope.
4. Послідовно передати її через validator, fraud detector і compliance checker.
5. Записати final outcome кожної input transaction у `shared/results/`, включно з rejected transactions.
6. Створити pipeline summary report.

Для однієї транзакції pipeline stages виконуються послідовно. Асинхронні file operations дозволені, але не повинні порушувати залежність stage від попереднього result.

## Дані, гроші та безпека

- Amount надходить як decimal string і обробляється precise decimal type.
- Currency перевіряється як підтримуваний ISO 4217 code.
- Timestamp використовує ISO 8601 UTC.
- Audit entry містить timestamp, agent name, transaction ID і outcome.
- Account numbers, names та інші PII не логуються plaintext; використовуй masking/redaction.
- Rejected result завжди містить машинозчитуваний status і зрозумілу reason.
- Не додавай зовнішню базу, queue, Docker або cloud service без вимоги, яку неможливо виконати простіше.

## Документація бібліотек

Для будь-якої роботи з framework, library, SDK, API або CLI використовуй Context7 перед реалізацією, навіть якщо API здається знайомим.

Порядок:

1. Resolve exact Context7 library ID.
2. Query docs одним конкретним concept на запит.
3. Застосуй отриманий pattern.
4. Додай до `docs/research-notes.md`: search text, library ID, insight та фактичне застосування.

Code-generation meta-agent повинен додати щонайменше два Context7 queries саме під час реалізації pipeline.

## Процес розробки

- Перед creative/implementation work використовуй релевантні Superpowers skills.
- Перед implementation створи або онови погоджений design і implementation plan.
- Для feature або bugfix застосовуй TDD: failing test → мінімальна implementation → passing test → refactor.
- Тести ізолюй від реального `shared/`, використовуючи temporary directory.
- Перед завершенням запускай повну релевантну verification і читай її output.
- Не змінюй unrelated user files і не роби destructive git operations.

## Журнал змін

`docs/log.md` є chronological append-only record. Після кожної матеріальної зміни додай запис у кінець файлу:

```markdown
## [YYYY-MM-DD] <type> | <коротка назва>

- Автор/інструмент: <ім’я або AI-інструмент>
- Зміни: <фактично виконані зміни>
- Файли: <фактично змінені файли>
- Перевірка: <фактично запущені команди або ручна перевірка>
```

Основні типи: `design`, `docs`, `research`, `implement`, `test`, `fix`, `refactor`, `lint`, `verify`.

Не переписуй і не сортуй старі записи. Не додавай verification, якої фактично не було.

## Git-політика

- Ніколи не виконуй `git commit`.
- Не виконуй `git add`, якщо студент прямо цього не попросив.
- Можна використовувати read-only `git status`, `git diff` і `git log` для перевірки.
- Після завершеного й перевіреного етапу запропонуй коротку Conventional Commit назву.
- Студент самостійно рев’ювить, stage-ить і комітить зміни.
