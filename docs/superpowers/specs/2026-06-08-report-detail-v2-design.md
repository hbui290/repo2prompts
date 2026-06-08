# Report Detail V2 Design Spec

## Goal

Redesign `/library/[id]` so a saved Repo2Prompts report feels like a useful technical artifact, not a pseudo-dashboard.

## Constraints

- Do not change backend generation, model provider behavior, API routes, database schema, or export formats.
- Do not add dependencies or install shadcn. Use existing React/CSS patterns.
- Keep dark premium styling, but reduce dashboard energy and score dominance.
- Preserve evidence, explicit uncertainty, and export/share utility.

## Required Page Order

1. Report header
2. Verdict strip
3. Primary next action
4. Confirmed / Inferred / Unknown
5. Mode-specific main body
6. Evidence panel
7. Compact quality snapshot
8. Export/share utilities

## Artifact Rules

- Header identifies repo, mode, depth, date, and views without showing technical metrics first.
- Verdict is a short human sentence derived from evidence coverage/readiness.
- Next action maps to mode:
  - build: copy implementation brief
  - review: review top findings
  - prompt: copy agent handoff
  - debug: check likely failure points
  - migration: review migration path
- Confirmed / Inferred / Unknown must be compact and scannable. No long markdown dumps.
- Readiness score is supporting context only. It must not visually dominate the report.
- Evidence is visible but subordinate to the report narrative.
- Export controls use one primary CTA, one secondary CTA, and an overflow-style details menu.

## Mode-Specific Bodies

- Build: what repo appears to do, implementation signals, suggested build order, risks/missing clarity, verification checklist.
- Review: top findings, risk areas, missing checks, evidence references, next review steps.
- Prompt: copyable agent handoff, constraints, confirmed facts, missing information, evidence summary.
- Debug: likely failure points, symptoms/suspected causes, checks to run, confidence notes.
- Migration: current state, migration target, risky edges, migration sequence, validation/rollback guidance.

## Acceptance Criteria

- User understands repo/mode/date/verdict in 5-8 seconds.
- Verdict and next action appear before score/metrics.
- Confirmed / Inferred / Unknown appears near the top.
- Report is mode-aware, not a generic markdown wall.
- Evidence remains useful and readable.
- Export controls are not a long equal-weight toolbar.
- Mobile layout stacks without horizontal overflow.
