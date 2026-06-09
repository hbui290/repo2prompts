# Architecture

Repo2Prompts is a Next.js 16 App Router application with a narrow server-side
analysis pipeline.

## Product surfaces

- `/`: homepage quick generator and product overview
- `/workbench`: advanced analysis flow with depth, focus, and evidence controls
- `/examples`: static sample reports for no-setup evaluation
- `/library` and `/library/[id]`: stored report views
- `/status`: environment and readiness snapshot
- `/api/briefs`: report generation
- `/api/context-pack`: evidence selection export
- `/api/status`: runtime status
- `/api/badge/[...repository]`: readiness badge for the latest stored report

## Code layout

- `src/app`: App Router pages, layouts, and API route handlers
- `src/components`: homepage, workbench, report, export, and chrome UI
- `src/domain`: deterministic business logic such as evidence shaping, prompt
  export, agent-readiness scoring, repository mapping, and context policy
- `src/integrations`: GitHub reads, model calls, brief storage, rate limiting,
  logging, and status snapshots
- `supabase/migrations`: optional durable storage and database-backed rate-limit
  support

## Boundary rules

- Keep deterministic selection, scoring, and shaping logic in `src/domain`
- Keep provider, GitHub, database, and runtime concerns in `src/integrations`
  or route handlers
- Preserve API contracts for `/api/briefs`, `/api/status`, and stored
  `evidence_json` unless a change explicitly updates them
- Treat generated output as assistive; verify important claims against cited
  repository evidence

## Runtime model

Repo2Prompts runs as a server-side application:

- browser clients submit repository URLs and options
- route handlers validate input and call the analysis pipeline
- integrations fetch repository evidence and call an OpenAI-compatible backend
- domain modules shape the resulting brief, exports, and readiness metadata
- optional Supabase storage caches and serves stored reports

## Verification path

For code or config changes, the default verification ladder is:

1. `npm exec pnpm lint`
2. `npm exec pnpm test`
3. `npm exec pnpm build`

For homepage or report-detail UI changes, also follow
`docs/REPORT_VISUAL_SMOKE.md`.
