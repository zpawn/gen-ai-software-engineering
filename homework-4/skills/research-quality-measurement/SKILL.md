---
name: research-quality-measurement
description: Use when verifying codebase research, source-backed claims, file and line references, snippets, root-cause analysis, or research reports before implementation planning.
---

# Research Quality Measurement

## Overview

Measure whether research is accurate, traceable, complete, and safe to use for
planning. A plausible claim is not verified until its cited source supports it.

## Verification Procedure

For every claim:

1. Read the cited source file; never judge from the report alone.
2. Confirm the repository-relative path exists and stays inside the repository.
3. Confirm each cited line or range exists and contains the stated evidence.
4. Compare each snippet with the cited lines. Ignore indentation and trailing
   whitespace only; paraphrases must not be presented as source snippets.
5. Classify the statement as an observed fact or an inference. Require the
   evidence to support the exact strength of the wording.
6. Confirm the claim is relevant to the reported issue and that all required
   issues are covered.

Record each claim as `VERIFIED`, `DISCREPANCY`, or `UNVERIFIABLE` with its claim
ID and source reference.

## Discrepancy Severity

| Severity | Use when |
| --- | --- |
| Critical | A key claim is false, unsupported, contradicted by source, cites a missing file or invalid line, uses a mismatched snippet, or omits a required issue. |
| Non-critical | The conclusion remains correct, but a reference is broader than necessary, optional context is missing, or wording needs minor precision. |

Treat unavailable required input or unreadable cited source as critical. Never
silently repair research; report the discrepancy and the correction required.

## Quality Levels

| Level | Rule |
| --- | --- |
| `EXCELLENT` | Every claim and snippet is verified, all required issues are covered, references are precise, and no discrepancy remains. |
| `GOOD` | All key claims and required issues are verified; only non-critical discrepancies remain and none changes a conclusion. |
| `NEEDS_REVISION` | No key claim is proven false, but material gaps, weak non-key inferences, or incomplete supporting detail make the research unsafe to use unchanged. |
| `FAILED` | At least one critical discrepancy exists, required evidence cannot be read, or a required issue is unsupported or omitted. |

## Overall Status

- `PASS`: quality is `EXCELLENT` or `GOOD`, with zero critical discrepancies.
- `FAIL`: quality is `NEEDS_REVISION` or `FAILED`.

`PASS` never means that incorrect evidence may be fixed mentally by the
verifier. Planning must consume only the written, verified report.

## Required Assessment Shape

```markdown
## Research Quality Assessment

- Level: EXCELLENT | GOOD | NEEDS_REVISION | FAILED
- Status: PASS | FAIL
- Critical discrepancies: <count>
- Non-critical discrepancies: <count>
- Reasoning: <brief explanation tied to the rules above>
```

Use only one level and its compatible status. List every discrepancy elsewhere
with claim ID, severity, source reference, impact, and required correction.

## Common Mistakes

- Trusting a convincing snippet without opening its source.
- Accepting a nearby line that does not support the claim.
- Treating an inference as a fact.
- Assigning `GOOD` when a critical discrepancy exists.
- Inventing labels outside the four defined quality levels.
