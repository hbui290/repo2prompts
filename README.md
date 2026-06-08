# Repo2Prompts

Clean-room implementation of a self-hosted public repository brief generator.

Enter a public GitHub repository, choose a report type, optionally focus the
scan on one question, and generate an evidence-backed brief for a coding agent.
Repo2Prompts is not just repo packing: it selects evidence, cites files, tracks
skipped input, and exports briefs for real agent workflows.

## Current scope

- Home report types: `build`, `review`, `debug`, and `migration`.
- Home scan depths: `fast`, `balanced`, and `deep`; focused scans are exposed as
  the advanced `Inspect one question` option.
- API compatibility keeps accepting `prompt` mode and `focused` depth for stored
  reports, exports, and direct integrations. Every report includes an agent
  handoff prompt.
- Adaptive analysis with repository maps, bounded deep module analysis, citations,
  deterministic quality checks, and evidence-fingerprint cache invalidation.
- Include/exclude filters for repository evidence selection.
- Selected/skipped file evidence, estimated tokens, and largest-file summaries.
- Copy, Markdown download, and JSON evidence export actions.
- Codex, Cursor, Claude, and generic Markdown export templates.
- Shareable report pages for stored briefs and static examples.
- Agent Readiness Score with deterministic breakdown, improvement checklist,
  best next prompt, verification commands, and basic safety warnings.
- README badge endpoint for previously generated reports.
- GitHub metadata, recursive tree, and selected readable file collection.
- Lightweight security guard for obvious secret paths and token-looking content.
- OpenAI-compatible JSON and SSE response parsing.
- Responsive self-hosted workbench.
- Status endpoint that does not expose secrets.
- Optional Supabase/PostgREST durable cache and brief library.
- Basic in-memory rate limiting for generation requests.
- MIT licensed source, with clean-room provenance documentation.

Embedding-based semantic search is intentionally deferred until the clean schema
and release audit are independently reviewed.

## Agent Readiness Score

Repo2Prompts scores generated reports from existing repository evidence. The
score is deterministic and does not add another model call.

It measures:

- documentation clarity
- setup clarity
- architecture clarity
- test visibility
- agent taskability
- risk and complexity

Reports include an improvement checklist, best next agent prompt, detected
verification commands, and basic rule-based safety warnings. Safety warnings are
not a security guarantee; they are based only on selected repository evidence
and configured checks.

Badge endpoint:

```md
[![AI Ready](https://repo2prompts.com/api/badge/owner/repo)](https://repo2prompts.com/library/report-id)
```

The badge reads the latest stored report for `owner/repo`. It does not generate
a report, call GitHub, or call the model provider.

## Configure

```bash
cp .env.example .env.local
```

Required:

```env
MODEL_BASE_URL=https://your-openai-compatible-endpoint/v1
MODEL_API_KEY=server-only-model-key
MODEL_CHAT_ID=chat-model-id
```

## Provider presets

Repo2Prompts is provider-neutral. Any gateway that supports OpenAI-compatible
`/chat/completions` can work with the same env names.

### 9router

Best for the verified self-host/local runtime.

```env
MODEL_BASE_URL=http://100.84.47.80:20128/v1
MODEL_API_KEY=replace-with-9router-key
MODEL_CHAT_ID=cx/gpt-5.5
MODEL_ANALYSIS_ID=cx/gpt-5.5
MODEL_WRITER_ID=cx/gpt-5.5
```

### Groq

Good for fast/cheap analysis tasks. Verify available model IDs in your Groq
account before production use.

```env
MODEL_BASE_URL=https://api.groq.com/openai/v1
MODEL_API_KEY=replace-with-groq-key
MODEL_CHAT_ID=llama-3.1-8b-instant
MODEL_ANALYSIS_ID=llama-3.1-8b-instant
MODEL_WRITER_ID=llama-3.3-70b-versatile
```

### OpenRouter

Good for provider flexibility. Free routes are useful for testing, but may be
rate-limited or lower quality for deep briefs.

```env
MODEL_BASE_URL=https://openrouter.ai/api/v1
MODEL_API_KEY=replace-with-openrouter-key
MODEL_CHAT_ID=openrouter/free
MODEL_ANALYSIS_ID=openrouter/free
MODEL_WRITER_ID=replace-with-quality-model-id
```

### Gemini-compatible gateway

Repo2Prompts currently uses OpenAI-compatible chat completions. Use Gemini
through an OpenAI-compatible gateway unless native Gemini API support is added
later.

```env
MODEL_BASE_URL=https://your-gemini-compatible-gateway/v1
MODEL_API_KEY=replace-with-gateway-key
MODEL_CHAT_ID=gemini-compatible-model-id
MODEL_ANALYSIS_ID=gemini-compatible-fast-model-id
MODEL_WRITER_ID=replace-with-quality-writer-model-id
```

Recommended routing: use a fast/cheap model for `MODEL_ANALYSIS_ID` and a
stronger model for `MODEL_WRITER_ID`.

Optional:

```env
GITHUB_API_TOKEN=
MODEL_ANALYSIS_ID=
MODEL_WRITER_ID=
MODEL_REQUEST_TIMEOUT_MS=90000
```

`MODEL_ANALYSIS_ID` handles repository/module mapping and `MODEL_WRITER_ID`
handles brief writing/repair. Both fall back to `MODEL_CHAT_ID`.

Optional durable cache:

```env
DATABASE_REST_URL=https://your-project.supabase.co/rest/v1
DATABASE_SERVICE_KEY=replace-with-server-only-secret
```

Apply the fresh schema from `supabase/migrations` to a separate Supabase project.
Never expose `DATABASE_SERVICE_KEY` through a `NEXT_PUBLIC_` variable.

The evidence workbench migration adds `analysis_mode`, expands accepted depth
values, and changes the cache key so different modes do not reuse the same
stored brief. The adaptive analysis migration adds a service-key-only repository
map cache and includes the evidence fingerprint in final brief cache identity.

## Analysis depths

- `fast`: reads a broad shortlist, keeps up to 7 files, and makes one writer call.
- `balanced`: keeps up to 20 files, creates or reuses a repository map, then writes.
- `focused`: ranks evidence using the supplied question and caches a question-specific map.
- `deep`: keeps up to 35 files, analyzes up to 6 modules with concurrency 3,
  merges the maps, then writes and may repair once.

Source blob SHAs, ref, path, filters, and selection policy form the evidence
fingerprint. A changed fingerprint prevents reuse of stale generated briefs.

Optional public and abuse-control config:

```env
RATE_LIMIT_WINDOW_MS=600000
RATE_LIMIT_MAX=10
NEXT_PUBLIC_SITE_URL=https://your-domain.example
NEXT_PUBLIC_ADS_PROVIDER=
NEXT_PUBLIC_ADS_CLIENT_ID=
```

Advertising variables are placeholders only. The app does not embed ads scripts
until an ads provider is explicitly implemented.

## Run

Start from the repo root, not `repo2prompt-clean-spec/`.

Bootstrap the repo with a fallback that does not require a global `pnpm`:

```bash
npm run bootstrap
```

This command reinstalls dependencies when native modules were installed for
another platform, checks the local Harness CLI artifact, and prints the standard
verification commands for the repo.

If you already have `pnpm`, the equivalent install flow is:

```bash
pnpm install
pnpm dev
```

Open `/examples` to inspect static build, review, debug, and migration reports
without configuring a model provider.

## Verify

```bash
pnpm test
pnpm lint
pnpm build
```

Without a global `pnpm`, use:

```bash
npm exec pnpm test
npm exec pnpm lint
npm exec pnpm build
```

## Evidence filters

Advanced filters accept comma-separated path patterns:

```text
include: src/**, app/**, package.json
exclude: **/*.test.ts, dist/**, node_modules/**
```

Filters can narrow repository context, but they cannot force secret-looking
files into model input.

## Production

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Vercel and self-hosted
deployment notes. See [docs/SECURITY.md](docs/SECURITY.md) for secret handling,
rate limiting, and abuse response.

## Intellectual-property status

This repository was initialized with fresh Git history and implemented from an
independent behavior specification. Review the clean-room report before public
distribution.

`Repo2Prompts` is the intended public product name. Complete formal
brand/trademark clearance before publishing.

See [docs/PROVENANCE.md](docs/PROVENANCE.md) and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
