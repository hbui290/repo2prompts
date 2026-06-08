# Report Visual Smoke Checklist

Use this checklist after changes to report detail layout, CTA wording, or
evidence rendering.

## Routes

- Static sample detail: `/examples/github-action-debug-brief`
- Static migration sample: `/examples/cli-migration-brief`
- Dynamic stored report: generate one report, then open `/library/<report-id>`

## Desktop checks

Viewport:

- `1440x900`

Verify:

- Primary CTA label starts with `Copy` and still copies content instead of navigating.
- `Confirmed`, `Inferred`, and `Unknown` cards render as separate blocks.
- Mode-specific sections keep their own content:
  - debug sample keeps real diagnostic steps in `Checks to run`
  - migration sample keeps real risk items in `Risky edges`
- Evidence file paths wrap inside cards and do not overflow the card width.
- Grouped reason paths render as stacked lines, not one long comma-separated line.
- Quality snapshot remains readable with long technical values.

## Mobile checks

Viewport:

- `390x844`

Verify:

- CTA buttons expand to full width and remain tappable.
- Evidence cards collapse to one column without horizontal scrolling.
- Long file paths and grouped reason paths wrap cleanly.
- No text overlaps the card border in `truth-table`, `mode-section`, or `evidence-panel`.

## Dynamic report sanity

After generating a fresh report:

- Open `/library/<report-id>`
- Confirm the report header, verdict strip, and evidence panel render without layout breakage.
- Confirm the copied primary CTA content matches the current mode:
  - build -> implementation brief
  - review -> review checklist
  - debug -> debugging checklist
  - migration -> migration plan
  - prompt -> agent handoff
