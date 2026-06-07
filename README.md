# Repo2Prompts

Clean-room implementation of a self-hosted public repository brief generator.

Enter a public GitHub repository and choose an analysis depth. The application
collects bounded repository evidence and asks an OpenAI-compatible model to
produce an implementation brief that distinguishes observations from inference.

## Current scope

- `fast`, `thorough`, and `focused` analysis modes.
- GitHub metadata, recursive tree, and selected readable file collection.
- OpenAI-compatible JSON and SSE response parsing.
- Responsive self-hosted workbench.
- Status endpoint that does not expose secrets.
- Optional Supabase/PostgREST durable cache and brief library.
- Basic in-memory rate limiting for generation requests.
- MIT licensed source, with clean-room provenance documentation.

Embedding-based semantic search is intentionally deferred until the clean schema
and release audit are independently reviewed.

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

Optional:

```env
GITHUB_API_TOKEN=
```

Optional durable cache:

```env
DATABASE_REST_URL=https://your-project.supabase.co/rest/v1
DATABASE_SERVICE_KEY=replace-with-server-only-secret
```

Apply the fresh schema from `supabase/migrations` to a separate Supabase project.
Never expose `DATABASE_SERVICE_KEY` through a `NEXT_PUBLIC_` variable.

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

```bash
pnpm install
pnpm dev
```

## Verify

```bash
pnpm test
pnpm lint
pnpm build
```

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
