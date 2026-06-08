# UI/UX Recovery Upgrade Spec

## Summary

Repo2Prompts currently has a stable product shell, working routes, report pages,
and generation flow, but the UI has been simplified below the intended product
experience. The attached context describes an earlier design direction with a
more memorable cyber/tool aesthetic, interactive preview, clear mode controls,
workflow proof, output quality cues, and richer visual motion. The current UI
keeps the core flow but loses too much of the premium, guided, componentized
experience.

This upgrade restores the product feeling without sacrificing usability. The
goal is not to add visual noise. The goal is to make the product feel like a
serious agent-prep workbench: readable, fast, mobile-safe, trustworthy, and
visually distinctive.

## Product Classification

- Type: Build + Debug.
- User pain: users need to understand quickly why turning a repo into an
  evidence-backed agent report is valuable, then generate or inspect a real
  report with low friction.
- Confirmed evidence: current homepage, workbench, and report detail are
  functional, but the UI is mostly static cards and forms. The provided context
  explicitly calls out missing hierarchy, weak trust proof, mobile issues, and
  a loss of richer mode/preview interactions.
- Riskiest assumption: adding effects/components will improve trust instead of
  making the app feel decorative. The design must stay product-first.
- Smallest test: upgrade the homepage first with sample repo, interactive mode
  preview, trust proof, and responsive cards; then manually smoke test desktop
  and mobile.
- Scope boundary: do not change `/api/briefs`, `/api/status`, stored evidence
  shape, analysis pipeline, or model/runtime behavior.

## Current State Audit

### Confirmed Present

- Homepage quick generator exists in `src/components/home-landing.tsx`.
- Workbench supports repository, mode, depth, focused question, include/exclude
  filters, progress messaging, generated output, exports, readiness, and
  evidence lists in `src/components/brief-workbench.tsx`.
- Report detail supports verdict, primary action, truth table, mode sections,
  evidence, quality snapshot, and exports in `src/components/report-view.tsx`
  and `src/components/report-utilities.tsx`.
- Static examples exist through `src/domain/example-reports.ts` and
  `/examples`.
- CSS has a dark cyber/glow foundation in `src/app/globals.css`.

### Confirmed Missing Or Too Weak

- Homepage no longer has a rich interactive "mode lab" or visible mode/depth
  selector. It only generates build/balanced.
- Hero preview is mostly static copy until generation. It does not show a
  before/after transformation or enough real report proof.
- The visual system has glow/grid styling, but lacks high-quality component
  effects such as scanning states, stepped reveal, command timeline, report
  anatomy, or progressive evidence map.
- Section hierarchy is flat: proof, why, examples, workflow, use cases share
  similar card styling and weight.
- Mobile layout is mostly safe now, but the design still compresses the value
  proposition into stacked cards rather than a guided mobile flow.
- Workbench is functionally strong but feels form-heavy and under-designed.
- Report detail is usable but not premium: it needs better sticky action,
  report anatomy, citation/evidence affordances, and summary scanning.
- Brand mark is generic gradient-square/wordmark and not yet memorable.

## Upgrade Principles

- Product-first, not cyberpunk-first.
- Keep copy short and concrete.
- Make the user understand the output before they spend a model request.
- Every effect must explain state, progress, evidence, or confidence.
- Prefer CSS and small React components over new dependencies.
- Respect `prefers-reduced-motion`.
- Mobile must be designed, not just stacked.
- Keep API contracts stable.

## Phase 1: Homepage Recovery

### Goals

Make the homepage immediately explain:

- What the product does.
- What the generated report contains.
- Why evidence-backed output is more trustworthy than a generic prompt.
- How to try it instantly.

### Required Changes

#### 1. Hero: Split Into Input + Report Console

Replace the current generic sample output card with a more specific report
console component:

- Left: headline, concise value prop, repository input, primary CTA.
- Right: "Report console" with three visible states:
  - `standby`: shows real sample report anatomy.
  - `generating`: shows progress steps and animated scan lines.
  - `complete`: shows readiness score, selected files, top risk, next prompt,
    and "Open full report".

Acceptance criteria:

- Empty state explains what to do next.
- `Try sample repo` fills the repo and should either generate directly or move
  the user into a clearly enabled state.
- CTA never feels disabled without explanation.
- Preview content is concrete, not placeholder-flavored.

#### 2. Restore Mode/Depth Selector On Homepage

Expose a compact mode selector above or below the input:

- Build
- Review
- Debug
- Migration
- Prompt

Expose depth as a secondary segmented control:

- Fast
- Balanced
- Deep

Focused mode stays in Workbench only unless a question field is shown.

Acceptance criteria:

- Homepage request body uses selected `mode` and `depth`, not hardcoded
  `build/balanced`.
- Selected mode changes preview labels and sample bullets.
- Mobile selector wraps into clean pill rows or a horizontal snap strip.

#### 3. Add Before/After Proof Section

Add a section showing transformation:

- Before: "Paste repo URL into an agent" with vague prompt and risk.
- After: "Evidence-backed report" with cited files, verification, next prompt.

Acceptance criteria:

- Section uses real repo/report language.
- It creates trust without requiring a live generation.
- It visually differs from normal cards.

#### 4. Add Report Anatomy Component

Add a dedicated component showing the output structure:

- Verdict
- Confirmed / inferred / unknown
- Risk areas
- Checks to run
- Selected evidence
- Copy/export actions

Acceptance criteria:

- Uses small annotated blocks or a mini wireframe, not paragraphs only.
- Links to `/examples`.
- Works as one column on mobile.

#### 5. Upgrade Example Reports Section

Current examples are useful but visually flat. Upgrade to richer report cards:

- readiness score badge
- mode/depth chip
- selected files count if available
- one strong line from actual markdown
- CTA "Open example report"

Acceptance criteria:

- Cards have varied visual hierarchy.
- Long markdown snippets do not overflow.
- At least one example is promoted as "Start here".

## Phase 2: Workbench Productization

### Goals

Turn Workbench from a configuration form into a guided analysis cockpit.

### Required Changes

#### 1. Guided Configuration Sidebar

Keep current controls, but reorganize them:

- Repository target
- Intent
- Evidence depth
- Scope filters
- Run

Add short "why this matters" hints for mode/depth.

Acceptance criteria:

- New users can pick settings without reading docs.
- Focused depth clearly requires a question.
- Advanced filters remain collapsed by default.

#### 2. Live Run Timeline

Replace single progress text with a visible run timeline:

- Resolve repo
- Read tree
- Select evidence
- Generate map
- Write report
- Quality check

Acceptance criteria:

- Existing `progressStepsForDepth` can power the UI.
- Loading state feels intentional instead of stalled.
- Reduced motion users still see text states.

#### 3. Evidence Map Preview

Before and after generation, show an evidence map panel:

- selected files
- skipped files
- largest files
- safety warnings
- estimated tokens

Acceptance criteria:

- Uses existing response evidence fields.
- Long paths wrap/truncate safely.
- Empty state teaches what evidence means.

## Phase 3: Report Detail Premium Pass

### Goals

Make report detail feel like the core artifact users want to share/copy, not a
generic markdown page.

### Required Changes

#### 1. Sticky Report Action Bar

Add a sticky or top-pinned action group:

- Copy primary handoff
- Copy Markdown
- Copy Codex
- Copy Cursor
- Copy Claude
- Copy evidence JSON

Acceptance criteria:

- Primary copy label matches behavior.
- On mobile, action bar becomes a compact full-width block.
- No dropdown is clipped offscreen.

#### 2. Report Anatomy Navigation

Add local section navigation:

- Verdict
- Truth table
- Mode report
- Evidence
- Quality

Acceptance criteria:

- Anchors scroll to sections.
- Active state optional, not required for first pass.
- Does not change report content order.

#### 3. Evidence Cards With Better Affordance

Improve evidence file rendering:

- path line
- reason line
- token/size metadata
- copy path button optional

Acceptance criteria:

- Path overflow is impossible on mobile.
- Grouped reasons no longer feel like raw internal data.
- Evidence panel reads as proof, not debug output.

## Phase 4: Visual System And Motion

### Goals

Restore high-quality feel without returning to readability problems.

### Required Changes

#### 1. Brand Mark Refresh

Replace generic square mark with a product-specific mark:

- repo graph + prompt cursor
- or evidence nodes flowing into a command block

Acceptance criteria:

- Works at nav size.
- Does not require image assets unless committed.
- Can be CSS/SVG inline.

#### 2. Motion Tokens

Add restrained motion:

- hero console reveal
- scan line while generating
- staggered card reveal
- button press/hover depth
- no infinite distracting animation except subtle background/scan

Acceptance criteria:

- Wrapped in `prefers-reduced-motion`.
- No layout shift.
- No CPU-heavy canvas or dependency.

#### 3. Section Weighting

Give each major section a different visual role:

- Hero: conversion.
- Proof strip: credibility.
- Before/after: pain clarity.
- Report anatomy: product education.
- Examples: trust proof.
- Workflow: process.
- Final CTA: conversion.

Acceptance criteria:

- Page no longer feels like repeated card grids.
- Mobile flow preserves the same information hierarchy.

## Component Plan

Add or refactor small components under `src/components`:

- `home-report-console.tsx`
- `home-mode-selector.tsx`
- `home-before-after.tsx`
- `home-report-anatomy.tsx`
- `run-timeline.tsx`
- `evidence-map.tsx`
- `report-section-nav.tsx`
- `brand-mark.tsx`

Keep components data-light and mostly presentational. Do not move domain logic
into UI components.

## CSS Plan

Update `src/app/globals.css` with grouped sections:

- design tokens
- nav/brand
- homepage
- workbench
- report detail
- shared cards/buttons
- responsive
- motion/reduced-motion

Do not perform a full styling rewrite unless needed. Prefer incremental
classes that coexist with current markup.

## Acceptance Criteria

### Functional

- Homepage can generate with selected mode and depth.
- Sample repo flow is obvious and usable.
- Workbench generation still calls `/api/briefs` with the same contract.
- Report detail export/copy behavior remains unchanged except improved labels
  and layout.
- `/api/status` and `/api/briefs` contracts unchanged.

### UI/UX

- No horizontal overflow at 320px, 390px, 768px, 1440px.
- CTA is never disabled without visible reason.
- Hero explains product in under 8 seconds.
- User can see a believable output shape before generating.
- Examples prove real output, not just marketing copy.
- Report detail can be scanned without reading the whole markdown.

### Performance

- No new large runtime dependency.
- No canvas/WebGL.
- CSS animations must be lightweight.
- Production build remains clean.

### Accessibility

- Keyboard focus visible.
- Buttons and links use correct semantics.
- `aria-live` only used for generation/result status.
- Reduced motion respected.
- Contrast remains readable on dark background.

## Verification Plan

Run after implementation:

```text
1. Unit/domain regression -> verify: npm test
2. Static quality -> verify: npm run lint
3. Production compile -> verify: npm run build
4. Security dependency check -> verify: npm exec pnpm audit --audit-level moderate
5. Local dev smoke -> verify: npm exec pnpm dev serves with webpack and no reload loop
6. Homepage manual smoke -> verify: sample repo, selected modes, mobile layout
7. Workbench manual smoke -> verify: mode/depth/focused/filter states
8. Report detail manual smoke -> verify: /examples/[slug] and /library/[id] export and evidence layout
```

## Implementation Order

1. Stabilize homepage mode/depth state and request body.
2. Add home report console and better sample/complete states.
3. Add before/after and report anatomy sections.
4. Improve responsive CSS and section hierarchy.
5. Productize Workbench loading/evidence panels.
6. Add report detail navigation/sticky actions.
7. Refresh brand mark and motion tokens.
8. Run full verification.

## Non-Goals

- Do not switch from Next.js/TypeScript.
- Do not redesign backend analysis pipeline.
- Do not change database schema.
- Do not add auth, billing, teams, or dashboards.
- Do not introduce a component library unless separately approved.
- Do not optimize for flashy effects over trust and readability.
