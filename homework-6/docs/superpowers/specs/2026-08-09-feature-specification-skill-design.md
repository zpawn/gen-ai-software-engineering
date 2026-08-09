# Дизайн skill для feature specifications

**Дата:** 2026-08-09  
**Статус:** погоджено студентом, готово до реалізації
**Студент:** ilia makarov

## 1. Мета

Створити project-level Claude Code skill, який допомагає `hw6-specification-agent` відтворювано створювати окрему технічну специфікацію для кожної feature до початку її реалізації.

Skill створює документацію, але не реалізує application code, tests або runtime configuration.

## 2. Розподіл відповідальностей

```text
/write-spec <feature>
        ↓
hw6-specification-agent
        ↓ використовує
hw6-writing-feature-specifications skill
        ↓ заповнює
specification-template.md
        ↓ створює
docs/specifications/<feature-slug>.md
```

- **Command** `/write-spec` є user-facing entry point і приймає feature name.
- **AI meta-agent** `hw6-specification-agent` досліджує project context і виконує workflow.
- **Skill** `hw6-writing-feature-specifications` визначає reusable методику, required sections, routing та quality gates.
- **Template asset** визначає однакову структуру всіх feature specifications.
- **Feature specification** є результатом workflow і входом для наступного design/implementation stage.

## 3. Канонічні шляхи

```text
.claude/
├── skills/
│   └── hw6-writing-feature-specifications/
│       ├── SKILL.md
│       └── assets/
│           └── specification-template.md
├── agents/
│   └── hw6-specification-agent.md
└── commands/
    └── write-spec.md

docs/
├── specification.md
└── specifications/
    └── <feature-slug>.md
```

`docs/specification.md` залишається загальною специфікацією всього banking transaction pipeline. Вона не перетворюється на index і не замінюється feature specs.

Кожна окрема feature отримує файл `docs/specifications/<feature-slug>.md`. Slug містить лише lowercase letters, digits і hyphens. Кореневі specification files не створюються.

## 4. Джерело шаблону

Skill обов’язково використовує як основу шаблон:

```text
homework-3/specification-TEMPLATE-example.md
```

Щоб Homework 6 не залежав від sibling directory під час запуску, до skill додається локальна адаптована копія:

```text
.claude/skills/hw6-writing-feature-specifications/assets/specification-template.md
```

Bundled asset зберігає базову структуру Homework 3:

1. Feature title та instruction block.
2. High-Level Objective.
3. Mid-Level Objectives.
4. Implementation Notes.
5. Beginning Context.
6. Ending Context.
7. Low-Level Tasks.

Загальні приклади для banking/API/testing із Homework 3 не копіюються дослівно в кожну нову specification. Asset містить один універсальний skeleton і project-specific quality checklist для money, security, audit, PII, tests та verification.

## 5. Workflow skill

1. Прочитати `AGENTS.md`, `README.md`, `docs/specification.md` і останні entries у `docs/log.md`.
2. Отримати feature title; якщо його немає, попросити користувача назвати feature.
3. Побудувати deterministic feature slug.
4. Перевірити, чи існує `docs/specifications/<feature-slug>.md`.
5. Якщо spec існує, оновлювати її без втрати погоджених рішень; якщо не існує — використати bundled template asset.
6. Дослідити релевантний code/docs context без implementation changes.
7. Уточнити лише ті вимоги, які суттєво змінюють scope або architecture.
8. Заповнити всі required sections і low-level task contracts.
9. Провести self-review на placeholders, ambiguity, contradictions, scope creep і unverifiable objectives.
10. Записати spec у канонічний feature path.
11. Додати append-only `docs` entry у `docs/log.md`.
12. Запропонувати Conventional Commit назву без `git add` або `git commit`.

## 6. Контракт feature specification

Кожен файл `docs/specifications/<feature-slug>.md` повинен містити:

- одну clear High-Level Objective;
- 3–5 measurable Mid-Level Objectives;
- explicit technical, security, data та quality constraints;
- Beginning Context із фактично наявними файлами й state;
- Ending Context із точними deliverables і verification commands;
- Low-Level Tasks, кожен із exact AI prompt, files to create/update, interfaces/functions і implementation details;
- assumptions, позначені як assumptions;
- out-of-scope boundary;
- definition of done.

Spec не повинна містити `TBD`, `TODO`, незаповнені bracket placeholders або твердження, що feature уже реалізовано.

## 7. Зміни наявних компонентів

### `hw6-specification-agent.md`

Agent отримує пряму вимогу використовувати `hw6-writing-feature-specifications` для feature specs і bundled template asset як структуру. Загальна `docs/specification.md` залишається окремим project-level mode.

### `write-spec.md`

Command приймає аргумент:

```text
/write-spec <feature-name>
```

За наявності feature name command створює/оновлює `docs/specifications/<feature-slug>.md`. Project-level `docs/specification.md` змінюється лише через explicit project mode, а не за замовчуванням.

### `AGENTS.md` і README

Обидва документи пояснюють:

- загальна spec: `docs/specification.md`;
- feature specs: `docs/specifications/<feature-slug>.md`;
- feature specs створюються через skill;
- skill використовує адаптовану локальну копію Homework 3 template.

## 8. Перевірка skill

Оскільки це новий skill, застосовується skill-TDD:

1. **RED:** дати fresh agent завдання створити feature spec без skill і зафіксувати structural omissions або path/template drift.
2. **GREEN:** створити мінімальний skill і повторити той самий сценарій із підключеним skill.
3. **REFACTOR:** закрити знайдені gaps і повторити validation.

Окремо перевірити:

- skill directory та YAML frontmatter;
- trigger description;
- bundled template existence;
- output routing для нової та existing feature;
- відсутність root-level feature specs;
- відсутність placeholders у generated spec;
- append-only log behavior;
- no-commit policy.

`SKILL.md` валідовується офіційним `quick_validate.py` із skill-creator package. Git-коміти та staging AI не виконує.
