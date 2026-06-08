# AGENTS.md

## Repository Purpose

Repo2Prompts is a Next.js 16 App Router application that turns public GitHub
repositories into evidence-backed briefs and report pages for coding agents.
The current product surface includes the homepage quick generator, advanced
workbench, static example reports, stored report pages, a badge endpoint, and
server-side analysis plus readiness metadata.

## Read First

- `README.md`
- `docs/DEPLOYMENT.md`
- `docs/SECURITY.md`
- `docs/REPORT_VISUAL_SMOKE.md`
- `src/integrations/analysis-pipeline.ts`
- `src/domain/report-artifact.ts`

<!-- HARNESS:BEGIN -->
## Harness

This repo uses Harness. Before work, read:

- `README.md`
- `docs/HARNESS.md`
- `docs/FEATURE_INTAKE.md`
- `docs/ARCHITECTURE.md`
- `docs/CONTEXT_RULES.md`
- `scripts/bin/harness-cli query matrix`

Use the Rust Harness CLI at `scripts/bin/harness-cli` as the main operational
tool.
<!-- HARNESS:END -->

## Common Commands

- `npm run bootstrap`: verify repo-root usage, reinstall native dependencies if needed, and confirm the local Harness CLI artifact.
- `npm run doctor`: print the current local runtime and Harness readiness without mutating repo-tracked files.
- `pnpm dev`: start the Next.js development server.
- `pnpm build`: create the production build.
- `pnpm start`: serve the production build.
- `pnpm test`: run the `node:test` suite through `tsx`.
- `pnpm lint`: run ESLint.
- `npm exec pnpm <command>`: repo-local fallback when `pnpm` is not installed globally.
- `npm run harness -- query matrix`: inspect current Harness proof status through the repo-local wrapper.

## Architecture Overview

- `src/app`: App Router routes, including homepage, workbench, library, status, examples, and API handlers.
- `src/components`: presentation and interaction components for workbench, report detail, exports, and site chrome.
- `src/domain`: deterministic business logic such as prompt shaping, readiness scoring, report artifact shaping, export formatting, and context selection.
- `src/integrations`: boundaries for GitHub reads, model calls, brief storage, logging, status snapshots, and rate limiting.
- `docs`: operating docs, product/design notes, Harness references, and manual smoke checklists.
- `scripts`: local bootstrap helpers, Harness wrapper entrypoints, and schema files for the durable layer.

## Repo-Specific Workflow

- Start from the repo root. `repo2prompt-clean-spec/` is a spec folder only; it forwards helper commands back to the runnable app.
- Prefer `npm run bootstrap` before local work on a new machine or after copying the repo across platforms.
- Treat `scripts/bin/harness-cli` as the stable entrypoint; it is a wrapper that resolves the current-platform artifact.
- For report detail or homepage UI changes, use `docs/REPORT_VISUAL_SMOKE.md` after `pnpm build`.
- Use static examples under `/examples` for fast report-detail checks before generating a new stored report.

## Constraints

- Keep API contracts for `/api/briefs`, `/api/status`, and stored `evidence_json` stable unless the task explicitly changes them.
- Preserve the installer-owned Harness block in this file; do not rewrite it manually.
- Do not assume global `pnpm` exists on the machine; document or use the repo-local fallback when needed.
- Keep deterministic logic in `src/domain` and external service/runtime concerns in `src/integrations` or route handlers.
