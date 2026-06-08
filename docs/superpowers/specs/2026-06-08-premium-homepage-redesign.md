# Premium Homepage Redesign

## Summary

Repo2Prompts needs to feel like a public product, not an internal control panel.
The homepage should explain the value quickly, show proof, and make the first
action obvious. Advanced configuration belongs in a dedicated workbench.

This redesign uses MotionSites only as visual inspiration for restrained dark
atmosphere, section framing, and premium glow. It uses Landing Pages Explained
only as product-flow inspiration for conversion structure, proof sections,
CTA timing, and show-not-tell examples.

No reference should be copied literally. Repo2Prompts keeps its own dark
graphite, cyan, and subtle purple product identity.

## Page Responsibilities

- `/`: public product homepage with quick generation, proof, examples, and CTA.
- `/workbench`: advanced generation surface with mode, depth, question, and filters.
- `/examples`: proof gallery showing realistic generated reports.
- `/library`: curated browser for generated reports.
- `/library/[id]`: detailed report proof asset.
- `/status`: product-facing status overview.
- `/api/status`: machine-readable status JSON.
- `/privacy` and `/terms`: credible launch-ready legal pages.

## Homepage Contract

The first screen must show one clear path:

- Paste a public GitHub repository.
- Generate a default build/balanced report.
- See a credible report preview.
- Open advanced workbench only when needed.

The homepage should not expose every mode, depth, and filter above the fold.

Required sections:

1. Hero with repo input, CTA, sample repo, and advanced workbench link.
2. Live/sample output preview with readiness, evidence paths, brief snippet, and next prompt.
3. Trust strip showing what the tool reads, filters, produces, and exports.
4. Why this is useful.
5. Example report previews.
6. How it works.
7. Use cases.
8. Final CTA.

## Visual Rules

- Dark graphite/midnight base.
- Cyan/teal is the primary functional accent.
- Purple neon haze is atmospheric only.
- Lime is limited to small success/ready indicators.
- Cards use a maximum 8px radius.
- Avoid particles, excessive orbs, flashy motion, web3 chrome, and generic AI-startup copy.
- Keep text readable before decorative treatment.

## Acceptance Criteria

- Homepage value is clear within 5 seconds.
- Homepage has one obvious first action.
- Workbench remains available for advanced use.
- Examples look like proof, not sparse links.
- Library feels curated, not like a raw archive.
- Status is a real page, not only a JSON endpoint.
- Legal pages feel complete enough for public use.
- Desktop and mobile have no horizontal overflow.
- `US-UI-001` has Harness evidence for static, runtime, visual, and platform checks.
