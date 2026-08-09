---
description: Створити або перевірити технічну специфікацію transaction pipeline за шаблоном Homework 6.
allowed-tools: Read, Grep, Glob, Write, Edit
---

Використай project subagent `specification-agent` для створення або оновлення специфікації Homework 6.

Обов’язковий workflow:

1. Прочитай `AGENTS.md`, `TASKS.md`, `README.md` і погоджені designs у `docs/superpowers/specs/`.
2. Якщо `docs/specification.md` існує, перевір його перед редагуванням; не перезаписуй погоджені рішення без пояснення.
3. Працюй тільки з канонічним шляхом `docs/specification.md`; не створюй кореневий `specification.md`.
4. Переконайся, що документ містить:
   - High-Level Objective;
   - 4–5 Mid-Level Objectives;
   - Implementation Notes;
   - Beginning/Ending Context;
   - Low-Level Tasks із exact prompt, file, function і details.
5. Перевір precise money, ISO 4217, audit logging, PII redaction, JSON message envelope, `shared/` directories, summary і coverage requirements.
6. Покажи короткий summary внесених змін і список assumptions.
7. Додай append-only запис у `docs/log.md`, якщо журнал існує.
8. Не виконуй `git add` або `git commit`; запропонуй студенту Conventional Commit назву.

