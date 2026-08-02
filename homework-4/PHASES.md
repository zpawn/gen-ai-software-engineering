# План виконання Homework 4: Multi-Agent Pipeline

Цей документ є покроковим roadmap для виконання домашнього завдання з
`TASKS.md`. Він описує порядок робіт, залежності між фазами, приклади команд,
очікувані файли та критерії готовності.

## Цільова платформа і межі файлів

Це рішення створюється спеціально для **Claude Code** як локальний plugin.

```text
Homework files:             Installed third-party skills:
.claude-plugin/             .claude/skills/
agents/                     skills-lock.json
skills/
scripts/
context/
```

- `.claude/skills/` містить стандартні або сторонні skills, встановлені через
  skill installer. Їх не редагує homework pipeline.
- `.claude-plugin/`, `agents/`, `skills/` і `scripts/` належать домашньому
  завданню.
- Repository root завантажується через `claude --plugin-dir .`.
- Claude Code agents зберігаються як `agents/*.md`.
- Claude Code skills зберігаються як `skills/<name>/SKILL.md`, а не як плоскі
  `skills/*.md` файли.
- Суфікс `.agent.md` збережено для відповідності назвам deliverables у
  `TASKS.md`; для Claude Code це валідний Markdown agent-файл.

## Поточний прогрес

| Фаза | Назва | Статус |
| --- | --- | --- |
| 0 | Визначення технічного формату pipeline | ✅ Виконано |
| 1 | Стабілізація застосунку і тестів | ✅ Виконано |
| 2 | Фіксація контрольованих проблем | ✅ Виконано |
| 3 | Структура та контракти артефактів | ✅ Виконано |
| 4 | Skills | ⏭️ Наступна |
| 5 | Bug Researcher і Bug Planner | ⬜ Не розпочато |
| 6 | Чотири обов'язкові агенти | ⬜ Не розпочато |
| 7 | One-command orchestrator | ⬜ Не розпочато |
| 8 | Dry run і негативні сценарії | ⬜ Не розпочато |
| 9 | Фінальний запуск pipeline | ⬜ Не розпочато |
| 10 | Screenshots | ⬜ Не розпочато |
| 11 | README і HOWTORUN | ⬜ Не розпочато |
| 12 | Фінальна перевірка і PR | ⬜ Не розпочато |

## Загальна послідовність

```text
Підготовка проєкту
→ Фіксація тестових дефектів
→ Контракти артефактів
→ Skills
→ Researcher і Planner
→ 4 обов'язкові агенти
→ Orchestrator
→ Тестовий запуск
→ Фінальний pipeline
→ Документація і screenshots
→ Pull Request
```

Фактичний порядок агентних етапів:

```text
Bug Researcher
→ Bug Research Verifier
→ Bug Planner
→ Bug Fixer
→ Security Verifier
→ Unit Test Generator
```

Чотири агенти є обов'язковими deliverables, але `TASKS.md` також вимагає
етапи Bug Researcher і Bug Planner. Найпрозоріший варіант — реалізувати їх як
два додаткові agent-файли та включити в той самий pipeline.

---

## Фаза 0. Визначити технічний формат pipeline

**Статус:** виконано.

### Мета

Визначити, що саме буде реально запускати Markdown-агентів. Файли
`*.agent.md` самі по собі не виконуються, тому потрібен CLI runner та
orchestrator.

### Сабтаски

- Обрати CLI/runner для неінтерактивного запуску агентів.
- Перевірити точний формат agent-файлів і підтримувані model IDs.
- Визначити спосіб передачі агенту:
  - system/task prompt;
  - потрібного skill;
  - вхідних і вихідних шляхів;
  - дозволених інструментів;
  - робочого каталогу.
- Обрати моделі відповідно до складності ролей:
  - сильні reasoning-моделі для Research Verifier і Security Verifier;
  - швидші або дешевші моделі для Fixer і Test Generator.
- Визначити permission policy:
  - Researcher, Research Verifier, Planner і Security Verifier отримують
    read-only tool allowlist;
  - Bug Fixer отримує write tools лише для plan-approved production files;
  - Unit Test Generator отримує write tools для tests і `test-report.md`;
  - `permissionMode` не використовується в plugin agents, бо Claude Code його
    для них ігнорує.
- Визначити stop conditions та exit codes.

### Приклад рішення

```text
Runner: Claude Code CLI у non-interactive mode (`claude -p`)
Orchestrator: scripts/run-pipeline.mjs
Entry point: npm run pipeline
Plugin loading: claude --plugin-dir .
Agent definitions: agents/*.agent.md
Skills: skills/<skill-name>/SKILL.md
Agent selection: --agent homework-4-agent-pipeline:<agent-name>
```

### Критерії готовності

- Обрано реальний CLI runner.
- Відомий синтаксис явного вибору моделі.
- Визначені read/write permissions кожної ролі.
- Зрозуміло, як skill автоматично потрапляє в контекст агента.
- Немає вигаданих CLI options або model IDs.

---

## Фаза 1. Стабілізувати базовий запуск застосунку

**Статус:** виконано. Застосунок стартує, build і тести проходять.

### Мета

Відокремити дефекти домашнього завдання від проблем залежностей, бази даних та
зовнішніх API.

### Сабтаски

- Встановити залежності відтворюваною командою.
- Підготувати environment variables.
- За потреби запустити PostgreSQL через Docker Compose.
- Перевірити build, unit та e2e tests.
- Не використовувати реальні Google, Jira чи AI API в unit-тестах.
- Використовувати mocks для repository та зовнішніх сервісів.
- Відокремити:
  - проблеми середовища;
  - навмисні seeded bugs;
  - unrelated issues поза scope.

### Приклад команд

```bash
npm ci
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

### Критерії готовності

- Застосунок локально стартує.
- Build проходить.
- Поточні тести проходять.
- Відомий test command для Bug Fixer і Unit Test Generator.
- Подальші агенти не залежать від реальних зовнішніх API.

---

## Фаза 2. Зафіксувати контрольовані проблеми

**Статус:** виконано.

### Мета

Дати pipeline малий, перевірений і достатньо конкретний scope: два
функціональні баги та одну проблему безпеки.

### Обраний сценарій

Сценарій зберігається в:

```text
context/bugs/001-settings-security/bug-context.md
```

Обрані проблеми:

1. `BUG-001`: optional-поля `UpdateSettingsDto` не мають послідовного
   `@IsOptional()`, тому частковий update може не пройти validation.
2. `BUG-002`: під час partial update відсутні поля замінюються на `''`, `[]`
   або default values, через що стираються наявні налаштування.
3. `SEC-001`: `GET /api/v2/settings` повертає збережений Jira API key.

### Що повинен містити bug-context

- ID і тип проблеми.
- Priority або severity.
- Preconditions.
- Steps to reproduce.
- Actual behavior.
- Expected behavior.
- Точні `file:line` references.
- Acceptance criteria.
- Pipeline expectations.
- Out-of-scope список.
- Заборону використовувати реальні секрети.

### Приклад безпечних тестових значень

```json
{
  "jiraAuthType": "bearer",
  "jiraApiKey": "test-jira-api-key",
  "jiraIssueKey": "DEMO-1"
}
```

### Критерії готовності

- Є щонайменше два functional bugs.
- Є щонайменше один security issue.
- Для кожної проблеми існують steps, expected result і acceptance criteria.
- Усі початкові `file:line` references відповідають vulnerable baseline.
- Production code на цій фазі ще не виправлено.

### Рекомендована назва коміту

```text
docs(hw4): define settings bug scenario
```

---

## Фаза 3. Спроєктувати структуру та контракти артефактів

**Статус:** виконано.

### Мета

До написання prompts визначити формальний контракт передачі даних між
агентами. Кожен етап повинен знати, що він читає, що створює та коли має
зупинитися.

### Сабтаски

- Створити `.claude-plugin/plugin.json` для локального Claude Code plugin.
- Створити каталоги `agents/`, `skills/`, `scripts/` і `docs/screenshots/`.
- Не додавати homework agents або skills у `.claude/skills/`.
- Створити порожній або шаблонний каталог артефактів сценарію.
- Описати input/output contract кожного pipeline stage.
- Визначити обов'язкові секції кожного generated report.
- Визначити, як передавати список changed files.
- Визначити правила overwrite/idempotency для повторного запуску.
- Визначити validation перед переходом до наступного stage.
- Визначити, які generated artifacts комітяться в репозиторій.

Мінімальний manifest:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-plugin-manifest.json",
  "name": "homework-4-agent-pipeline",
  "displayName": "Homework 4 Agent Pipeline",
  "version": "1.0.0",
  "description": "Six-stage bug research, fix, security, and test pipeline",
  "author": {
    "name": "illia makarov"
  }
}
```

### Очікувана структура

```text
homework-4/
├── .claude-plugin/
│   └── plugin.json
├── .claude/
│   └── skills/  # installed third-party skills; not homework-owned
├── PHASES.md
├── README.md
├── HOWTORUN.md
├── agents/
│   ├── bug-researcher.agent.md
│   ├── research-verifier.agent.md
│   ├── bug-planner.agent.md
│   ├── bug-fixer.agent.md
│   ├── security-verifier.agent.md
│   └── unit-test-generator.agent.md
├── skills/
│   ├── research-quality-measurement/
│   │   └── SKILL.md
│   └── unit-tests-first/
│       └── SKILL.md
├── scripts/
│   └── run-pipeline.mjs
├── context/bugs/001-settings-security/
│   ├── bug-context.md
│   ├── research/
│   │   ├── codebase-research.md
│   │   └── verified-research.md
│   ├── implementation-plan.md
│   ├── fix-summary.md
│   ├── security-report.md
│   └── test-report.md
├── docs/screenshots/
├── src/
└── test/
```

### Матриця handoff-контрактів

| Stage | Читає | Створює | Може змінювати код |
| --- | --- | --- | --- |
| Bug Researcher | `bug-context.md`, source | `codebase-research.md` | Ні |
| Research Verifier | research, source, quality skill | `verified-research.md` | Ні |
| Bug Planner | verified research, source | `implementation-plan.md` | Ні |
| Bug Fixer | implementation plan, source | код, `fix-summary.md` | Так, лише за plan |
| Security Verifier | fix summary, changed files | `security-report.md` | Ні |
| Unit Test Generator | fix summary, changed files, FIRST skill | tests, `test-report.md` | Лише tests/report |

### Обов'язкові перевірки orchestrator

Для кожного output:

- файл існує;
- файл не порожній;
- файл містить required headings;
- посилання мають формат `path:line`;
- stage повернув exit code `0`;
- заборонені файли не були змінені.

### Критерії готовності

- Усі каталоги створені.
- Для кожного stage визначені inputs, outputs і permissions.
- Формати reports не суперечать `TASKS.md`.
- Залежності між stages однозначні.
- Немає потреби вигадувати структуру output під час написання agent prompts.

---

## Фаза 4. Створити skills

### Мета

Винести повторно використовувані правила оцінки research і unit tests з
agent prompts у два окремі skills.

### Сабтаски

Створити в native Claude Code plugin format:

```text
skills/research-quality-measurement/SKILL.md
skills/unit-tests-first/SKILL.md
```

#### Research Quality Measurement

Skill повинен визначати:

- критерії точності `file:line` references;
- правила перевірки snippets;
- рівні якості, наприклад:
  - `EXCELLENT`;
  - `GOOD`;
  - `NEEDS_REVISION`;
  - `FAILED`;
- правила загального `PASS/FAIL`;
- критичні та некритичні discrepancies;
- формат секції `Research Quality Assessment`.

Приклад правила:

```text
FAILED: хоча б одне ключове твердження посилається на неіснуючий файл,
неправильний рядок або суперечить source code.
```

#### Unit Tests FIRST

Skill повинен визначати:

- **Fast** — unit-тести не запускають реальні network/database services;
- **Independent** — порядок запуску тестів не впливає на результат;
- **Repeatable** — немає залежності від поточного часу чи зовнішніх даних;
- **Self-validating** — результат визначається assertions;
- **Timely** — тести створюються разом зі зміною поведінки.

### Автоматичне завантаження

Claude Code автоматично знаходить plugin skills у `skills/*/SKILL.md` після
завантаження `--plugin-dir .`. Agent frontmatter має явно preload відповідний
skill, а orchestrator додатково перевіряє його наявність перед запуском stage.

### Критерії готовності

- Обидва required skill files існують.
- Skills містять конкретні правила, а не лише визначення термінів.
- Research Verifier і Unit Test Generator посилаються на них.
- Pipeline автоматично завантажує skills без ручного кроку.

---

## Фаза 5. Реалізувати Bug Researcher і Bug Planner

### Мета

Реалізувати два початкові stages, які потрібні повному run order, хоча вони не
входять у четвірку обов'язкових agent deliverables.

### Bug Researcher

Створити в homework plugin:

```text
agents/bug-researcher.agent.md
```

Він повинен:

- прочитати `bug-context.md` повністю;
- дослідити лише relevant source code;
- не змінювати код;
- описати root cause кожної проблеми;
- додати точні `file:line` references;
- навести короткі snippets;
- відокремити facts від assumptions;
- створити `research/codebase-research.md`.

### Bug Planner

Створити в homework plugin:

```text
agents/bug-planner.agent.md
```

Він повинен:

- читати `verified-research.md`, а не неперевірений research;
- не змінювати код;
- описати зміни окремо для кожного файла;
- зазначити before/after behavior;
- визначити test commands;
- включити security fix у plan;
- створити `implementation-plan.md`.

### Критерії готовності

- Researcher створює factual research із реальними references.
- Planner не запускається до успішної verification.
- Implementation plan достатньо конкретний для Bug Fixer.
- Обидва stages працюють без production writes.

---

## Фаза 6. Створити чотири обов'язкові агенти

### 6.1 Bug Research Verifier

Файл:

```text
agents/research-verifier.agent.md
```

Сабтаски:

- додати explicit model у frontmatter;
- автоматично підключити research-quality skill;
- дозволити лише read-only operations;
- перевірити кожен file, line і snippet;
- задокументувати discrepancies;
- створити `research/verified-research.md`;
- повернути FAIL при критично неправильному research.

Required sections:

```text
Verification Summary
Verified Claims
Discrepancies Found
Research Quality Assessment
References
```

### 6.2 Bug Fixer

Файл:

```text
agents/bug-fixer.agent.md
```

Сабтаски:

- прочитати `implementation-plan.md` повністю;
- змінювати лише plan-approved files;
- робити зміни невеликими логічними кроками;
- запускати relevant tests після кожного кроку;
- при test failure задокументувати проблему і зупинитися;
- створити `fix-summary.md`.

Required sections:

```text
Changes Made
Test Results
Overall Status
Manual Verification
References
```

### 6.3 Security Verifier

Файл:

```text
agents/security-verifier.agent.md
```

Сабтаски:

- прочитати `fix-summary.md`;
- отримати точний список changed files;
- перевірити injection, hardcoded secrets, insecure comparisons, missing
  validation, unsafe dependencies, XSS і CSRF, де це релевантно;
- присвоїти кожному finding severity:
  `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` або `INFO`;
- для finding додати `file:line`, impact і remediation;
- створити тільки `security-report.md`;
- не змінювати production code або tests.

### 6.4 Unit Test Generator

Файл:

```text
agents/unit-test-generator.agent.md
```

Сабтаски:

- прочитати `fix-summary.md` і changed files;
- автоматично завантажити FIRST skill;
- створювати тести тільки для changed behavior;
- слідувати існуючому Jest/NestJS стилю;
- використовувати `Test.createTestingModule` і mocks;
- не викликати реальні PostgreSQL, Jira, Google чи AI API;
- запустити generated tests;
- створити `test-report.md`.

### Приклад розподілу моделей

Точні model IDs треба брати з обраного CLI, але стратегія така:

| Агент | Клас моделі | Причина |
| --- | --- | --- |
| Research Verifier | Strong reasoning | Точна перевірка фактів і references |
| Bug Fixer | Balanced coding | Локальні контрольовані зміни |
| Security Verifier | Strong reasoning | Аналіз ризиків і false negatives |
| Unit Test Generator | Fast coding | Рутинне створення test scaffolding |

### Критерії готовності

- Є всі чотири required `*.agent.md`.
- У кожного агента є explicit model.
- Визначені inputs, outputs, tools, permissions і stop conditions.
- Skills реально використовуються потрібними агентами.
- Security Verifier не має write permissions.

---

## Фаза 7. Реалізувати one-command orchestrator

### Мета

Забезпечити повний послідовний запуск без ручного виклику агентів між
етапами.

### Сабтаски

Створити:

```text
scripts/run-pipeline.mjs
```

Додати до `package.json`:

```json
{
  "scripts": {
    "pipeline": "node scripts/run-pipeline.mjs"
  }
}
```

Orchestrator повинен викликати Claude Code через `claude -p`, завантажувати
homework plugin через `--plugin-dir .` і вибирати stage через `--agent`.

Наприклад:

```bash
claude -p --plugin-dir . \
  --agent homework-4-agent-pipeline:research-verifier \
  "Verify scenario 001"
```

Orchestrator повинен:

1. Перевірити prerequisites, environment і доступність Claude Code CLI.
2. Визначити project root і bug scenario.
3. Зафіксувати початковий git state або baseline reference.
4. Запустити Bug Researcher.
5. Перевірити `codebase-research.md`.
6. Завантажити quality skill і запустити Research Verifier.
7. Зупинитися, якщо verification status — `FAIL`.
8. Запустити Bug Planner.
9. Перевірити `implementation-plan.md`.
10. Запустити Bug Fixer.
11. Визначити changed production files через git diff.
12. Запустити Security Verifier лише на changed code.
13. Завантажити FIRST skill і запустити Unit Test Generator.
14. Запустити фінальні build і tests.
15. Надрукувати загальний pipeline summary.

### Приклад console output

```text
[1/6] Bug Researcher .............. PASS
[2/6] Research Verifier ........... PASS (GOOD)
[3/6] Bug Planner ................. PASS
[4/6] Bug Fixer ................... PASS
[5/6] Security Verifier ........... PASS (0 unresolved HIGH findings)
[6/6] Unit Test Generator ......... PASS
[final] Build and tests ........... PASS
```

### Failure behavior

- Відсутній required output → stop.
- Agent exit code не `0` → stop.
- Research verification `FAIL` → Planner не запускається.
- Fixer test failure → Security/Test Generator не запускаються.
- Security agent змінив файл → stage failure.
- Final tests failed → pipeline failure.

### Повторний запуск

Потрібно заздалегідь визначити idempotency strategy:

- vulnerable baseline зафіксований окремим commit;
- pipeline не повинен мовчки перезаписувати unrelated user changes;
- на вже виправленому коді pipeline може зробити no-op verification або
  попросити явно повернутися до baseline;
- generated reports можна контрольовано перезаписувати лише в каталозі
  обраного scenario.

### Критерії готовності

- Увесь workflow запускається через `npm run pipeline`.
- Немає ручних кроків між stages.
- Skills завантажуються автоматично.
- Homework plugin завантажується через `--plugin-dir .`.
- Homework components не змішуються з `.claude/skills/`.
- Pipeline перевіряє outputs і permissions.
- Помилки мають зрозумілий log та ненульовий exit code.

---

## Фаза 8. Провести dry run

### Мета

Перевірити orchestration до фінального запуску, не пошкодивши vulnerable
baseline і не створивши неконтрольовані зміни.

### Сабтаски

- Запускати pipeline на disposable branch або git worktree.
- Перевірити кожен handoff окремо.
- Перевірити happy path.
- Перевірити негативні сценарії:
  - відсутній research file;
  - verifier повернув FAIL;
  - planner не створив plan;
  - fixer зламав test;
  - security verifier спробував редагувати код;
  - test generator створив тести для unrelated code.
- Перевірити, що reports не містять реальних secrets.
- Перевірити, що source references валідні після кожного stage.

### Критерії готовності

- Усі handoffs працюють.
- Pipeline правильно зупиняється при failure.
- Fixer не виходить за implementation plan.
- Security Verifier не змінює файли.
- Unit Test Generator тестує тільки changed behavior.
- Повторний запуск має передбачуваний результат.

---

## Фаза 9. Запустити фінальний pipeline

### Мета

Отримати fixed application, generated tests і всі required agent outputs одним
повним запуском.

### Сабтаски

- Переконатися, що source знаходиться у documented vulnerable baseline.
- Переконатися, що немає unrelated uncommitted changes.
- Запустити:

  ```bash
  npm run pipeline
  ```

- Переглянути всі generated reports.
- Перевірити, що виправлено BUG-001, BUG-002 і SEC-001.
- Переконатися, що нові тести відповідають FIRST.
- Виконати фінальну перевірку:

  ```bash
  npm run build
  npm test -- --runInBand
  npm run test:e2e -- --runInBand
  ```

- Переглянути `git diff` і виключити unrelated changes.
- За можливості підтвердити, що generated tests падають на vulnerable version
  та проходять на fixed version.

### Required outputs

```text
context/bugs/001-settings-security/research/codebase-research.md
context/bugs/001-settings-security/research/verified-research.md
context/bugs/001-settings-security/implementation-plan.md
context/bugs/001-settings-security/fix-summary.md
context/bugs/001-settings-security/security-report.md
context/bugs/001-settings-security/test-report.md
```

### Критерії готовності

- Усі required outputs існують і заповнені.
- Production fixes відповідають plan.
- Security issue більше не відтворюється.
- Generated tests проходять.
- Existing tests і build залишаються green.

---

## Фаза 10. Підготувати screenshots

### Мета

Додати візуальні докази того, що pipeline і fixed application реально
працюють.

### Сабтаски

Зберегти screenshots у:

```text
docs/screenshots/
```

Рекомендований набір:

```text
01-pipeline-start.png
02-research-verification.png
03-fixes-applied.png
04-security-report.png
05-unit-tests.png
06-application-running.png
```

Screenshots мають показувати:

- одну команду запуску pipeline;
- успішний Research Verification;
- changed files або fix summary;
- результат security review;
- passing generated unit tests;
- запущений застосунок або health endpoint.

### Правила безпеки

- Не показувати `.env`.
- Не показувати access/refresh tokens.
- Не показувати Jira, Google або AI API keys.
- Приховувати приватні URL чи персональні дані.

### Критерії готовності

- Screenshots читабельні.
- Вони відповідають фінальному запуску.
- Ключові screenshots додані і в репозиторій, і в PR description.

---

## Фаза 11. Оформити README і HOWTORUN

### README.md

Додати:

- ім'я та інформацію про студента;
- короткий опис застосунку;
- мету Homework 4;
- опис двох bugs і security issue;
- Mermaid-схему повного six-stage pipeline;
- таблицю agent roles і models;
- коротке обґрунтування model selection;
- опис двох skills;
- setup/run/test/pipeline commands;
- список generated artifacts;
- короткий опис fixes;
- links або embedded screenshots;
- AI tools used і що було перевірено вручну.

Також потрібно виправити застарілу документацію route prefix, якщо README все
ще описує `/api/v1`, а application використовує `/api/v2`.

### HOWTORUN.md

Додати покроково:

- prerequisites;
- installation;
- environment setup;
- database startup;
- application startup;
- build;
- unit tests;
- e2e tests;
- pipeline command;
- expected outputs;
- troubleshooting.

### Приклад quick start

```bash
npm ci
cp .env.example .env
docker compose up -d
npm run start:dev
```

В окремому terminal:

```bash
npm test -- --runInBand
npm run pipeline
```

### Критерії готовності

- Новий користувач може запустити проєкт лише за документацією.
- README містить author/student info.
- Model choices пояснені.
- Команди перевірені, а не написані з пам'яті.
- Screenshots і artifacts мають робочі links.

---

## Фаза 12. Фінальна перевірка і Pull Request

### Мета

Переконатися, що submission відтворюється з чистого clone і відповідає всім
вимогам курсу.

### Сабтаски

- Перевірити проєкт у clean clone або clean worktree.
- Виконати:

  ```bash
  npm ci
  npm run build
  npm test -- --runInBand
  npm run pipeline
  ```

- Перевірити відсутність реальних secrets.
- Перевірити повноту required files.
- Переконатися, що generated artifacts закомічені.
- Перевірити `git status` і `git diff`.
- Підготувати логічну commit history.
- Push у branch `homework-4-submission`.
- Створити Pull Request у власний fork, не в original course repository.
- Призначити викладача reviewer.

### Що включити в PR description

- Summary реалізованого рішення.
- Повний pipeline flow.
- Обрані agents, skills і models.
- Опис seeded bugs та security issue.
- Опис fixes і generated tests.
- Точні команди для перевірки.
- AI tools та prompts/workflow.
- Challenges і прийняті рішення.
- Embedded screenshots.

### Приклад структури PR

```markdown
## Summary
## Pipeline Architecture
## Seeded Issues and Fixes
## Agent and Model Selection
## How to Verify
## Test Results
## AI-Assisted Workflow
## Challenges
## Screenshots
```

### Критерії готовності

- Clean-clone rehearsal пройшов.
- PR має детальний опис, а не один рядок.
- У PR вбудовані screenshots.
- Reviewer може відтворити результат за README/HOWTORUN.
- У репозиторії немає secrets або unrelated changes.

---

## Definition of Done для всього завдання

Homework готове, коли одночасно виконуються всі умови:

- є чотири обов'язкові агенти;
- Researcher і Planner включені в автоматичний workflow;
- є два required skills;
- homework agents і skills оформлені як Claude Code plugin components;
- installed third-party skills залишаються окремо в `.claude/skills/`;
- кожен required agent має explicit model;
- README пояснює model selection;
- `npm run pipeline` виконує весь процес без ручних кроків;
- pipeline автоматично завантажує related skills;
- виправлено два bugs і один security issue;
- створені всі required research/plan/fix/security/test artifacts;
- усі references посилаються на реальні файли та рядки;
- generated unit tests відповідають FIRST;
- build, unit tests і relevant e2e tests проходять;
- README та HOWTORUN завершені;
- screenshots додані до репозиторію та PR;
- PR має детальний опис і готовий до review.

## Робоче правило переходу між фазами

Не переходити до наступної фази, поки критерії поточної не виконані. Після
кожної фази:

1. перевірити створені файли;
2. запустити релевантні validations/tests;
3. переглянути `git diff`;
4. зробити окремий логічний commit;
5. оновити статус у таблиці на початку цього документа.
