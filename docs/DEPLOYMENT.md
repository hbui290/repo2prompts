# Deployment

Repo2Prompts is a standard Next.js App Router application. Vercel is the default
target, but any Node-compatible host can run it.

## Production environment

Set these server-side variables:

```env
MODEL_BASE_URL=https://your-openai-compatible-endpoint/v1
MODEL_API_KEY=server-only-model-key
MODEL_CHAT_ID=chat-model-id
GITHUB_API_TOKEN=optional-github-token
DATABASE_REST_URL=https://your-project.supabase.co/rest/v1
DATABASE_SERVICE_KEY=server-only-supabase-service-key
RATE_LIMIT_WINDOW_MS=600000
RATE_LIMIT_MAX=10
NEXT_PUBLIC_SITE_URL=https://your-domain.example
NEXT_PUBLIC_ADS_PROVIDER=
NEXT_PUBLIC_ADS_CLIENT_ID=
```

Do not define provider keys or database service keys with `NEXT_PUBLIC_`.

## Supabase

Apply the SQL migration in `supabase/migrations` to the production Supabase
project. The app uses `DATABASE_SERVICE_KEY` from server code to read and write
cached briefs. If you change projects, apply the migration again and update
`DATABASE_REST_URL`.

## Vercel

1. Import the GitHub repository.
2. Set the environment variables above in Project Settings.
3. Deploy the `main` branch.
4. Run a production smoke test:

```bash
curl https://your-domain.example/api/status
```

## Self-hosted Node

```bash
pnpm install
pnpm build
pnpm start
```

Use a reverse proxy for TLS and request logging. Keep `.env.local` private.

## Advertising

The application is ads-ready through environment placeholders, but it does not
embed any advertising script by default. Add an ads component only after a real
provider account and privacy/consent requirements are ready.

