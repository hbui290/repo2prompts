# Product Core Plus And Public Readiness Spec

## Summary

Repo2Prompts must become a genuinely useful developer product before advertising or monetization work matters.

The product direction is:

> Repo2Prompts turns a public GitHub repository into an evidence-backed, agent-ready technical brief with citations, task-specific modes, quality checks, exports, and shareable reports.

This is intentionally stronger than basic repo packers:

- It does not only concatenate files.
- It selects evidence.
- It separates observed facts, inferences, and unknowns.
- It creates mode-specific briefs for build, review, debug, migration, and prompt workflows.
- It stores shareable reports that can become public examples and SEO pages later.

Advertising remains a future layer. The immediate goal is a product strong enough that developers, freelancers, and AI-coding users would actually use it.

## Existing Foundation

The app already has:

- Evidence workbench UI.
- Adaptive analysis pipeline.
- Depths: `fast`, `balanced`, `focused`, `deep`.
- Modes: `build`, `review`, `debug`, `migration`, `prompt`.
- Provider-neutral OpenAI-compatible model client.
- Task-aware model routing via `MODEL_ANALYSIS_ID` and `MODEL_WRITER_ID`.
- Optional Supabase/PostgREST cache and library.
- Evidence fingerprint cache invalidation.
- Selected/skipped/largest files metadata.
- Lightweight secret path/content guard.
- Terms/privacy pages.
- In-memory generation rate limit.
- Clean-room provenance docs.

## Product Goals

- Make first-run value obvious in under 5 seconds.
- Make generated briefs credible through citations and evidence metadata.
- Make `deep` analysis feel powerful, not slow or stuck.
- Make report pages useful enough to share with a client, teammate, or AI agent.
- Make exports fit real workflows: Codex, Cursor, Claude, and generic Markdown.
- Make examples demonstrate quality without requiring users to generate first.
- Keep model/provider setup flexible: 9router, Groq, OpenRouter, Gemini-compatible gateways.
- Keep production launch safe: no secret exposure, reasonable abuse controls, clear legal copy.

## Non-Goals

- No ads script until the product is usable and a real ads provider/client ID exists.
- No payment/paywall in this phase.
- No native Gemini SDK in this phase.
- No Jira integration.
- No embedding/Jina semantic search in this phase.
- No complete observability stack such as Sentry/Datadog in this phase.
- No broad UI rewrite; only targeted product and report improvements.

## Core Differentiators

## 1. Evidence-Backed Briefs

### Requirement

Every generated brief should clearly communicate:

- what was observed from files,
- what is inferred,
- what remains unknown,
- which files support the claims.

### UI Requirement

The result panel and report detail page should show:

- selected files,
- skipped files with reasons,
- estimated tokens,
- largest files,
- pipeline used,
- repository map source,
- modules analyzed,
- quality warnings,
- repair status,
- evidence fingerprint in a shortened form.

### Acceptance Criteria

- A user can inspect why the brief said something.
- Citations in the brief refer only to selected evidence files.
- Quality warnings are visible and written in plain language.

## 2. Agent Task Modes

### Requirement

The app must make modes feel meaningfully different:

- `build`: product intent, architecture, implementation plan, verification.
- `review`: risks, bugs, maintainability, test gaps, severity-ranked checklist.
- `debug`: likely failure areas, diagnostics, reproduction steps, fixes.
- `migration`: current state, target state, phases, rollback plan.
- `prompt`: concise agent-ready prompt with constraints and expected output.

### UI Requirement

Each mode should have:

- short user-facing description,
- result output label,
- export template support.

### Acceptance Criteria

- Switching mode changes both output structure and report metadata.
- Cached results do not collide across modes.
- Example reports include at least three modes.

## 3. Deep Analysis Workbench

### Requirement

`deep` mode must feel intentional and trustworthy despite latency.

### Required Behavior

Add client-side progress/status text in `src/components/brief-workbench.tsx`.

The UI should show staged messages while loading:

- For all requests:
  - `Preparing request...`
  - `Collecting repository evidence...`
  - `Selecting files and estimating context...`
- For `balanced` and `focused`:
  - `Building repository map...`
  - `Writing brief...`
- For `deep`:
  - `Building module map...`
  - `Analyzing modules. Deep mode can take longer...`
  - `Writing final brief...`
- If a request exceeds 30 seconds:
  - `Still working. Deep repositories can take a few minutes.`
- If a request exceeds 75 seconds:
  - `This is taking longer than expected. You can wait, or retry with Balanced.`

### Implementation Notes

- Do not add a streaming API in this phase.
- Use a client-side timer-based status sequence.
- Clear all timers when the request completes or errors.
- Keep the submit button disabled while the request is active.
- Keep the existing API contract unchanged.

### Acceptance Criteria

- `deep` mode shows a deep-specific long-running status within the first few seconds.
- Status text updates over time while the request is active.
- Status text resets after success/error.
- No memory leak from uncleared timers.

## 4. Shareable Report Detail

### Requirement

`/library/[id]` should become a polished report page, not just a raw `<pre>`.

### Required Sections

- Report header:
  - repository,
  - mode,
  - depth,
  - generated date,
  - source/cache status if available.
- Executive summary:
  - first useful section extracted from the brief or a short generated summary if already stored.
- Brief body:
  - readable Markdown styling,
  - citations visible,
  - no cramped raw pre formatting.
- Evidence panel:
  - selected files,
  - skipped files,
  - largest files,
  - token estimate.
- Analysis panel:
  - pipeline,
  - map source,
  - module count,
  - quality warnings,
  - repaired status.
- Actions:
  - copy Markdown,
  - download Markdown,
  - export evidence JSON,
  - copy share link.

### Acceptance Criteria

- A report can be sent to a client/team and still look credible.
- Old legacy records without new metadata render gracefully.
- Mobile report layout remains readable.

## 5. AI Agent Export Templates

### Requirement

Add export formats for real agent workflows:

- Generic Markdown.
- Codex handoff.
- Cursor prompt.
- Claude prompt.

### Behavior

Exports should preserve:

- repository,
- mode,
- depth,
- brief,
- selected evidence paths,
- unknowns/quality warnings if available.

Exports should not include:

- full source file contents,
- model prompts,
- API keys,
- service keys.

### Suggested Interface

Extend `BriefActions` with an export format selector:

```ts
type ExportFormat = "markdown" | "codex" | "cursor" | "claude" | "evidence-json";
```

### Acceptance Criteria

- Users can copy/download each agent-specific format.
- Export tests verify the format names and core sections.
- Exported content stays deterministic for the same input.

## 6. Public Example Reports

### Requirement

Users should see proof of value without making a request first.

### Example Routes

Create static or database-backed example pages for:

- Next.js app build brief.
- Supabase app review brief.
- GitHub Action debug brief.
- CLI migration brief.

Suggested route:

```text
/examples
/examples/[slug]
```

### Required Content

Each example should show:

- repository name,
- mode/depth,
- short summary,
- selected evidence,
- final brief excerpt,
- action to analyze another repo.

### Acceptance Criteria

- Homepage links to examples.
- README can link to examples or screenshots.
- Examples do not require model/database availability at runtime.

## 7. Homepage Product Messaging

### Requirement

Homepage should communicate the unique value clearly:

> Not just repo packing. Evidence-backed briefs for AI coding agents.

### Required Messaging

First screen should answer:

- what to paste,
- what the user receives,
- why it is more trustworthy than raw repo dumps,
- which modes are available.

### Acceptance Criteria

- A new user understands the product in under 5 seconds.
- Sample repo buttons remain visible.
- CTA path is clear.
- No payment/ads copy distracts from the product.

## Provider And Cost Routing

Provider details are defined in:

```text
docs/superpowers/specs/2026-06-08-provider-presets-and-cost-routing.md
```

Product Core+ should preserve these rules:

- 9router is the verified local/self-host preset.
- Groq is a fast/cheap analysis preset.
- OpenRouter is a flexible public preset.
- Gemini should use an OpenAI-compatible gateway in this phase.
- `MODEL_ANALYSIS_ID` should be cheap/fast when possible.
- `MODEL_WRITER_ID` should be stronger for final briefs.
- No provider key should be exposed to the client.

## Runtime And UI Verification

### Required Checks

- `GET /` renders the workbench.
- Generate a brief using each depth:
  - `fast`
  - `balanced`
  - `focused` with a question,
  - `deep`.
- Verify result panel shows:
  - brief markdown,
  - source `generated` or `cache`,
  - selected files,
  - skipped files,
  - estimated tokens,
  - adaptive analysis metadata.
- `GET /library` renders without crashing.
- `GET /library/[id]` renders a generated record.
- `GET /examples` renders once implemented.
- Desktop viewport does not overflow horizontally.
- Mobile viewport stacks controls/readable output without horizontal overflow.

### Acceptance Criteria

- All four depths return a usable brief or a clear, typed error.
- `/library` and `/library/[id]` work with existing stored rows.
- No mobile horizontal scroll from the workbench or file lists.
- Verification notes identify provider/database configuration state without printing secrets.

## Public Production Readiness

## 1. Production Deployment

### Supported Targets

Primary target:

- Vercel + hosted Supabase/PostgREST.

Secondary target:

- Self-hosted Node behind a reverse proxy.

### Required Production Env

```env
MODEL_BASE_URL=
MODEL_API_KEY=
MODEL_CHAT_ID=
MODEL_ANALYSIS_ID=
MODEL_WRITER_ID=
MODEL_REQUEST_TIMEOUT_MS=90000
GITHUB_API_TOKEN=
DATABASE_REST_URL=
DATABASE_SERVICE_KEY=
RATE_LIMIT_WINDOW_MS=600000
RATE_LIMIT_MAX=10
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_ADS_PROVIDER=
NEXT_PUBLIC_ADS_CLIENT_ID=
```

### Required Checks

- Production build succeeds.
- `/api/status` returns configured/disabled states without secrets.
- Supabase migrations are applied to the production project.
- Domain is pointed to the selected hosting target.
- Smoke test from the public domain:
  - `GET /`,
  - `GET /api/status`,
  - `POST /api/briefs`,
  - `GET /library`,
  - `GET /library/[id]`.

### Acceptance Criteria

- Public URL can generate at least one `fast` brief.
- Public URL can open the generated brief in `/library/[id]` when database is configured.
- No provider/database secret appears in browser HTML, JS, `/api/status`, or docs.

## 2. Public Polish

### Demo Media

Add:

- one desktop screenshot,
- one mobile screenshot,
- optional short demo GIF/video if lightweight.

Suggested paths:

```text
public/demo/desktop.png
public/demo/mobile.png
public/demo/workbench.gif
```

README should display at least the desktop screenshot after the introduction.

### README

README should make the first-time path obvious:

1. Configure model provider.
2. Configure optional database.
3. Run locally.
4. Generate a brief.
5. Open/share a report.
6. Deploy.

### Terms/Privacy

Update `src/app/privacy/page.tsx` and `src/app/terms/page.tsx` for the actual public deployment:

- operator/project name,
- contact route or email if available,
- whether generated briefs are public in the library,
- whether analytics or ads are enabled,
- retention/deletion process.

If these details are not ready, the pages must say they are operator-controlled and should be reviewed before public launch.

### Ads

Do not hardcode ads scripts yet.

Allowed:

- keep env placeholders,
- reserve a future `AdSlot` component only if it renders nothing when env is empty.

Not allowed:

- embedding Google AdSense or another provider before account/client ID and privacy copy are ready.

## 3. Public Rate Limit

### Current State

`POST /api/briefs` uses an in-memory limiter keyed by forwarded IP headers.

### Public Requirement

For public launch, support a shared limiter option.

Preferred implementation:

- Use Supabase/PostgREST table-based rate limit because Supabase is already optional infrastructure.
- Keep the current in-memory limiter as fallback.

### Proposed Env

```env
RATE_LIMIT_BACKEND=memory
RATE_LIMIT_WINDOW_MS=600000
RATE_LIMIT_MAX=10
```

Future public deployment can set:

```env
RATE_LIMIT_BACKEND=database
```

### Database Design

Table:

```sql
create table public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null,
  route text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_events_lookup_idx
  on public.rate_limit_events (route, key_hash, created_at desc);
```

Rules:

- Store a hash of the IP/request key, not the raw IP.
- Delete old rows opportunistically.
- Count rows within the active window.
- Database limiter failure should fail closed or open based on env:

```env
RATE_LIMIT_DB_FAILURE_MODE=open
```

Default for hobby launch: `open`, to avoid database issues taking the app offline.

### Acceptance Criteria

- In-memory limiter still passes existing tests.
- Database limiter has unit tests with mocked store calls.
- Public docs explain memory vs database rate limit.
- No raw IP is stored by the database limiter.

## 4. Lightweight Logging

### Goals

Help debug public failures without exposing sensitive data.

### Log Events

Server logs should include:

- route,
- request id,
- error code,
- provider status category,
- repository key if safe,
- mode/depth,
- duration milliseconds,
- cache source when available.

Server logs must not include:

- API keys,
- service keys,
- full source files,
- full prompts,
- full generated briefs,
- focused question text unless explicitly redacted/truncated.

### Proposed Utility

Create:

```text
src/integrations/server-log.ts
```

Interface:

```ts
type LogLevel = "info" | "warn" | "error";

type SafeLogEvent = {
  route: string;
  requestId: string;
  event: string;
  code?: string;
  repository?: string;
  mode?: string;
  depth?: string;
  durationMs?: number;
  source?: string;
};

export function logServerEvent(level: LogLevel, event: SafeLogEvent): void;
```

Behavior:

- JSON stringify safe fields only.
- Ignore unknown object fields.
- Never accept arbitrary error objects directly.

### Acceptance Criteria

- Generation success logs one safe info event.
- Typed errors log one safe warn/error event.
- Tests verify secrets in sample inputs do not appear in emitted logs.

## Security And Public Hygiene

### Required Checks Before Public Push

```bash
git status --short
git ls-files | rg '^(.env.local|node_modules|.next|ip-audit|gitreverse)'
rg -n "sk-|sb_secret|sbp_|AIza|ghp_|github_pat_" .
pnpm test
pnpm lint
pnpm build
git diff --check
```

### Acceptance Criteria

- No tracked `.env.local`, `.next`, `node_modules`, `ip-audit`, or old `gitreverse` directory.
- No obvious secret patterns in tracked source/docs.
- Tests, lint, and build pass.
- Clean-room docs remain in place.

## Implementation Priority

Product-first order:

1. Deep progress UX.
2. Shareable report detail upgrade.
3. AI agent export templates.
4. Public example reports.
5. Homepage product messaging.
6. Runtime UI verification across all depths/pages.
7. Lightweight logging.
8. Public rate limit backend option.
9. Screenshot/demo docs.
10. Terms/privacy final copy.
11. Production deployment.
12. Ads component only after product quality and provider approval are ready.

## Final Release Checklist

Before publishing:

- [ ] Verify provider preset docs.
- [ ] Verify production env.
- [ ] Apply Supabase migrations.
- [ ] Run full local verification.
- [ ] Verify all four depths.
- [ ] Verify shareable reports.
- [ ] Verify exports.
- [ ] Verify examples.
- [ ] Deploy production.
- [ ] Smoke test public domain.
- [ ] Review terms/privacy.
- [ ] Confirm ads disabled unless legal/privacy copy is ready.
- [ ] Confirm rate limit backend choice.
- [ ] Commit final state.
- [ ] Tag a release if desired.

## Open Decisions

- Deployment target: Vercel or VPS.
- Public domain.
- Whether the library is publicly browsable or operator-only.
- Contact email/route for privacy and abuse reports.
- Whether public launch needs database rate limiting immediately or only after initial traffic.
- Whether examples are static fixtures or generated from stored briefs.
