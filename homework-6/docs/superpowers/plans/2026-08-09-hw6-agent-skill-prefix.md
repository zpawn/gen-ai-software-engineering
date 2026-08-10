# HW6 Agent and Skill Prefix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `hw6-` prefix to all Homework 6 Claude Code skill and AI meta-agents created.

**Architecture:** Rename directory/file identity, matching YAML frontmatter and all active references is performed as one atomic documentation/configuration migration. Slash commands remain stable user-facing entry points.

**Tech Stack:** Claude Code project skills, custom subagents, custom commands, Markdown, YAML, official skill-creator validator.

## Global Constraints

- Only skills and agents created in Homework 6 are renamed.
- Superpowers skills and slash commands are not renamed.
- The prefix has the exact format `hw6-`.
- Append-only `docs/log.md` is not overwritten.
- AI does not perform `git add` or `git commit`.

---

### Task 1: RED naming baseline

**Files:**
- Verify: `.claude/skills/writing-feature-specifications/SKILL.md`
- Verify: `.claude/agents/*.md`

**Interfaces:**
- Consumes: approved naming map.
- Produces: evidence that prefixed identities do not exist before rename.

- [x] Check that `.claude/skills/hw6-writing-feature-specifications/SKILL.md` is missing.
- [x] Check that `.claude/agents/hw6-specification-agent.md` and other prefixed agent files are missing.
- [x] Fix RED result: prefixed discovery check fails because rename has not yet been performed.

### Task 2: Rename skills and agents

**Files:**
- Move: `.claude/skills/writing-feature-specifications/` → `.claude/skills/hw6-writing-feature-specifications/`
- Move: `.claude/agents/specification-agent.md` → `.claude/agents/hw6-specification-agent.md`
- Move: `.claude/agents/code-generation-agent.md` → `.claude/agents/hw6-code-generation-agent.md`
- Move: `.claude/agents/unit-test-agent.md` → `.claude/agents/hw6-unit-test-agent.md`
- Move: `.claude/agents/documentation-agent.md` → `.claude/agents/hw6-documentation-agent.md`

**Interfaces:**
- Consumes: old directory/file identities.
- Produces: matching prefixed paths and YAML `name` values.

- [x] Move files/directories without staging.
- [x] Update skill `name` to `hw6-writing-feature-specifications`.
- [x] Update four agent `name` values to their `hw6-` filenames.
- [x] Update `hw6-specification-agent` skill preload reference.

### Task 3: Update active references and documentation

**Files:**
- Modify: `.claude/commands/*.md`
- Modify: `AGENTS.md`
- Modify: `README.md`
- Modify: `docs/research-notes.md`
- Modify: `docs/skill-evaluations/writing-feature-specifications.md`
- Modify: `docs/superpowers/specs/*.md`
- Modify: `docs/superpowers/plans/*.md`
- Append: `docs/log.md`

**Interfaces:**
- Consumes: prefixed skill and agent identities.
- Produces: commands and documentation with no stale active references.

- [x] Replace active skill, agent and path references according to the approved naming map.
- [x] Preserve historical names inside existing append-only log entries.
- [x] Append factual rename entry to `docs/log.md`.

### Task 4: GREEN validation and review

**Files:**
- Verify: all renamed files and references.

**Interfaces:**
- Consumes: completed rename migration.
- Produces: validated Claude Code discovery contract.

- [x] Verify all five prefixed paths and matching YAML names exist.
- [x] Verify old paths no longer exist.
- [x] Verify `/write-spec` references `hw6-specification-agent`, which preloads `hw6-writing-feature-specifications`.
- [x] Run official `quick_validate.py` against the renamed skill.
- [x] Run stale-reference scan excluding append-only `docs/log.md` and explicit old→new naming history.
- [x] Run Markdown fence check and `git diff --check`.
- [x] Obtain independent read-only review.
- [x] Suggest a commit title without staging or committing.
