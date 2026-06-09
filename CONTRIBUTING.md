# Contributing to Repo2Prompts

Thanks for contributing.

## Local setup

Start from the repo root:

```bash
npm run bootstrap
cp .env.example .env.local
```

Run the app:

```bash
npm exec pnpm dev
```

## Verification before opening a PR

Run the standard checks:

```bash
npm exec pnpm lint
npm exec pnpm test
npm exec pnpm build
```

If your change touches homepage or report-detail presentation, also follow
`docs/REPORT_VISUAL_SMOKE.md`.

## Scope guardrails

- Keep deterministic logic in `src/domain`
- Keep external service and runtime concerns in `src/integrations` or route
  handlers
- Preserve API contracts unless the change explicitly updates them
- Do not commit secrets, provider keys, or service-role credentials

## Pull requests

When opening a PR:

- explain what changed and why
- include validation commands you ran
- call out any assumptions, tradeoffs, or follow-up work
- keep unrelated cleanup out of scope

## Issues

- Use bug reports for broken or regressed behavior
- Use feature requests for roadmap or product-facing improvements
- Use the security process in `SECURITY.md` for vulnerabilities
