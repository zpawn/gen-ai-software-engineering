---
name: document-metadata
description: Manage author attribution, ISO 8601 timestamps, and semantic versions in Markdown YAML frontmatter. Use whenever creating or modifying Markdown documents that need author, created, last-modified, version, or version-updated metadata, including requests to bump major, minor, or patch versions.
argument-hint: "[major|minor|patch|update]"
compatibility: Requires Git to resolve the author name.
---

# Document Metadata Manager

Manage author attribution and semantic version metadata without disturbing unrelated YAML frontmatter fields or document content.

## Workflow

1. Identify the Markdown files created or modified by the current task. If the target is ambiguous, ask the user which file to update.
2. Read the author with `git config user.name`. If it is empty or unavailable, preserve an existing `author`; otherwise ask the user for the author name instead of inventing one.
3. Generate timestamps in UTC ISO 8601 format, for example `2026-03-12T14:30:00Z`.
4. Parse existing YAML frontmatter when present. Preserve every unrelated field and its value.
5. Apply the metadata rules below.
6. Write valid YAML frontmatter delimited by `---`, leaving the Markdown body unchanged except for edits required by the user's task.
7. Re-read the result and verify that the YAML is valid, the requested version operation was applied exactly once, and existing unrelated metadata remains present.

## Author and timestamp rules

- Set `author` to the Git author when creating a document or when author attribution is missing. Do not overwrite a non-empty existing author unless the user explicitly requests re-attribution.
- Add `created` when it is missing. Preserve an existing `created` value during later edits.
- Set `last-modified` to the current timestamp whenever the document is edited.
- Preserve existing frontmatter fields and their values unless the current request explicitly changes them.

## Version rules

Treat the optional operation as one of `major`, `minor`, `patch`, or `update`. If no operation is supplied, use `update`.

1. Read `version` from frontmatter. If it is absent, start from `0.1.0`.
2. Apply the selected operation:
   - `major`: `1.2.3` → `2.0.0`
   - `minor`: `1.2.3` → `1.3.0`
   - `patch`: `1.2.3` → `1.2.4`
   - `update`: keep the current version unchanged
3. Set `version-updated` to the current timestamp when processing the version metadata, including `update` operations.
4. If an existing version is not valid `major.minor.patch` numeric syntax, stop and ask the user how to handle it rather than guessing.

## Example frontmatter

```yaml
---
author: John Doe
version: 1.2.0
created: 2026-03-12T10:00:00Z
last-modified: 2026-03-12T14:30:00Z
version-updated: 2026-03-12T14:30:00Z
---
```
