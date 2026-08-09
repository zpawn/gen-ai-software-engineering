# Evaluation: hw6-writing-feature-specifications

## RED baseline

**Дата:** 2026-08-09  
**Умова:** fresh agent отримав запит створити окрему specification для recurring-payments feature без доступу до нового skill або його design.

### Prompt

```text
Quickly prepare a technical specification for a new recurring-payments feature.
We want a separate specification for every feature.

Read only AGENTS.md, README.md, .claude/agents/hw6-specification-agent.md,
and .claude/commands/write-spec.md. Return the exact output path, complete
section outline, workflow steps, and questions you would ask first.
```

### Observed baseline behavior

- Agent вибрав `docs/specification.md`, тобто загальну project spec, замість окремого feature path.
- Agent сам помітив, що `docs/specifications/recurring-payments.md` потребує зміни project rules, але не мав reusable routing contract.
- Outline містив core sections і assumptions, але не мав explicit out-of-scope section та definition of done.
- Agent не використовував Homework 3 template як канонічне джерело структури, бо template не був bundled у workflow.
- Low-Level Tasks були domain-specific, але їхній exact field contract залежав від agent interpretation, а не від reusable template.

### RED result

**Result: FAIL**

Baseline підтвердив основну проблему: agent без skill не має стабільного output routing і template contract для окремих feature specifications.

## GREEN success criteria

Той самий scenario із skill повинен:

1. Вибрати `docs/specifications/recurring-payments.md`.
2. Залишити `docs/specification.md` незмінною як project-level spec.
3. Використати bundled asset, адаптований із `homework-3/specification-TEMPLATE-example.md`.
4. Включити High-Level Objective, 3–5 measurable Mid-Level Objectives, Implementation Notes, Beginning/Ending Context і structured Low-Level Tasks.
5. Додати assumptions, out-of-scope boundary і definition of done.
6. Не залишити `TBD`, `TODO` або bracket placeholders.
7. Не реалізовувати feature code.
8. Дотриматися append-only log і no-commit policy.

## GREEN run

**Дата:** 2026-08-09  
**Умова:** fresh agent отримав той самий recurring-payments scenario та explicit skill path `.claude/skills/hw6-writing-feature-specifications/SKILL.md`.

### Observed behavior with skill

- Agent вибрав точний canonical path `docs/specifications/recurring-payments.md`.
- Agent залишив загальну `docs/specification.md` незмінною.
- Outline відповідав bundled template: objectives, implementation subsections, context, assumptions, out of scope, structured low-level tasks і Definition of Done.
- Workflow явно завантажував bundled template, перевіряв existing target, ставив по одному material clarification і завершував self-review.
- Agent зберіг no-implementation, append-only log і no-commit boundaries.

### GREEN result

**Result: PASS**

Усі вісім GREEN success criteria виконано. Routing failure із RED baseline усунено skill contract.

## Artifact-producing RED/GREEN run

Щоб перевірити не лише відповідь agent, а й фактичні file operations, той самий scenario повторено у двох ізольованих fixtures усередині workspace. Обидва fresh agents отримали вказівку реально змінити файли, не реалізовувати application code і не використовувати git.

### RED artifact

- Fixture містила старі `AGENTS.md`, `/write-spec` і `hw6-specification-agent`, але не містила нового skill або feature-spec design.
- Початковий SHA-256 `docs/specification.md`: `8f7afbb9c415db7520107174f72aafe0735a2fe65bf063dfae38eb29666b177e`.
- Fresh agent змінив саме `docs/specification.md`; фінальний SHA-256: `b063b1acc53954d9cc6718912ddba31752a5c20a1cf680de6abb565b060800a2`.
- `docs/specifications/recurring-payments.md` не було створено.
- Кількість machine-readable log headings зросла з 9 до 10; попередні записи не переписано.

**Artifact result: FAIL.** Старий workflow перетворив feature request на зміну загальної project specification.

### GREEN artifact

- Fixture містила інтегрований `hw6-writing-feature-specifications` skill і bundled template.
- Fresh agent створив `docs/specifications/recurring-payments.md` та додав записи в кінець `docs/log.md`.
- SHA-256 `docs/specification.md` до і після run залишився `8f7afbb9c415db7520107174f72aafe0735a2fe65bf063dfae38eb29666b177e`.
- Кількість machine-readable log headings зросла з 12 до 14; diff журналу містив лише додані у кінець записи.
- Generated spec містила всі required sections, 4 structured Low-Level Tasks і 6 explicit `[ASSUMPTION]` markers; `TBD`, `TODO`, `{{...}}` та незаповнених placeholders не знайдено.
- Agent повідомив `FINAL_ARTIFACT_CHECK_OK`; application code і git state не змінювалися.

**Artifact result: PASS.** Реальні артефакти підтвердили routing, template contract, збереження project spec і append-only log behavior.

Тимчасові fixtures після фіксації результатів видалено; recurring-payments spec не є частиною Homework 6 deliverables.

## Validator reproducibility

Official `quick_validate.py` потребує `PyYAML`, якого немає у system Python цього середовища. Перевірку виконано в ізольованому temporary venv:

```bash
python3 -m venv /tmp/hw6-skill-validate-venv
/tmp/hw6-skill-validate-venv/bin/pip install PyYAML
/tmp/hw6-skill-validate-venv/bin/python \
  /Users/illia.mak/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .claude/skills/hw6-writing-feature-specifications
```

Фактичний результат: `Skill is valid!` (`PyYAML 6.0.3`). Temporary venv не входить до repository.

## Refactor

Додатковий refactor після GREEN run не знадобився: agent правильно застосував output path, complete template outline і workflow boundaries з першої перевірки.
