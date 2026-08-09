# Дизайн HW6-префіксів для власних skill та agents

## Мета

Однозначно відрізнити створені в Homework 6 Claude Code skill та AI meta-agents від вбудованих і сторонніх сутностей.

## Naming map

| Тип | Поточна назва | Нова назва |
|---|---|---|
| Skill | `writing-feature-specifications` | `hw6-writing-feature-specifications` |
| Agent | `specification-agent` | `hw6-specification-agent` |
| Agent | `code-generation-agent` | `hw6-code-generation-agent` |
| Agent | `unit-test-agent` | `hw6-unit-test-agent` |
| Agent | `documentation-agent` | `hw6-documentation-agent` |

Назва skill змінюється одночасно в directory path і `name` frontmatter. Назви agents змінюються одночасно у filenames і `name` frontmatter. Усі commands, agent references, documentation, designs, plans, evaluations і validation commands оновлюються на нові назви.

## Межі

- Slash commands `/write-spec`, `/run-pipeline` і `/validate-transactions` не перейменовуються.
- Superpowers skills у `.claude/skills/` не перейменовуються, бо вони не створені в межах Homework 6.
- TypeScript pipeline agents не входять до цього rename: вони є application components, а не Claude Code AI meta-agents.
- Git staging і commit не виконуються.

## Перевірка

1. У `.claude/agents/` існують лише чотири HW6-agent filenames із префіксом `hw6-`.
2. Custom skill існує лише за шляхом `.claude/skills/hw6-writing-feature-specifications/` і має matching frontmatter name.
3. `/write-spec` делегує `hw6-specification-agent`, який preload-ить `hw6-writing-feature-specifications`.
4. Пошук старих назв не знаходить активних references, окрім append-only історичних записів у `docs/log.md`.
5. Official skill validator, Markdown fence check і `git diff --check` проходять.

## Ризики та запобіжники

Головний ризик — залишити старе ім’я в command або agent frontmatter, через що Claude Code не знайде dependency. Тому rename виконується атомарно за naming map, а після нього запускається repository-wide reference scan.
