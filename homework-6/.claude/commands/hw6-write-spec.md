---
description: Створити або оновити окрему feature specification; --project оновлює загальну pipeline specification.
argument-hint: [feature-name | --project]
allowed-tools: Read, Grep, Glob, Write, Edit, Agent
---

Використай project subagent `hw6-specification-agent` через `/hw6-write-spec` для створення або оновлення специфікації.

Передай йому arguments: `$ARGUMENTS`.

- Якщо `$ARGUMENTS` порожній, зупинись і попроси назву feature. Не вигадуй feature name.
- Якщо `$ARGUMENTS` дорівнює `--project`, працюй у project mode з `docs/specification.md`.
- В іншому разі працюй у feature mode, використовуй preloaded skill `hw6-writing-feature-specifications` і записуй результат у `docs/specifications/<feature-slug>.md`.

Обов’язковий workflow:

1. Прочитай `AGENTS.md`, `TASKS.md`, `README.md` і погоджені designs у `docs/superpowers/specs/`.
2. У feature mode прочитай `docs/specification.md` як project context, але не змінюй його.
3. У project mode перевір existing `docs/specification.md` перед редагуванням; не перезаписуй погоджені рішення без пояснення.
4. Не створюй specification files у корені.
5. Переконайся, що документ містить:
   - High-Level Objective;
   - у project mode — 4–5 measurable Mid-Level Objectives;
   - у feature mode — 3–5 measurable Mid-Level Objectives;
   - Implementation Notes;
   - Beginning/Ending Context;
   - Low-Level Tasks із exact prompt, file, function і details.
6. Для feature spec також перевір assumptions, out-of-scope boundary, Definition of Done і відсутність template placeholders.
7. Перевір precise money, ISO 4217, audit logging, PII redaction, JSON message envelope, `shared/` directories, summary і coverage requirements, якщо вони релевантні feature.
8. Покажи короткий summary внесених змін і список assumptions.
9. Додай append-only запис у `docs/log.md`, якщо журнал існує.
10. Не виконуй `git add` або `git commit`; запропонуй студенту Conventional Commit назву.
