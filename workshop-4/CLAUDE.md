# Claude Code instructions

Project Agent Skills are stored canonically in `.agents/skills/<skill-name>/SKILL.md`.

Claude Code discovery entries under `.claude/skills/` link to those canonical directories. Discover and use the relevant skill when its description matches the task, or when the user invokes its slash command. Treat `.agents/skills` as the source of truth and do not edit a separate copy through the `.claude` path.
