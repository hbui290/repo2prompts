# Scripts

This directory contains local developer helpers for Repo2Prompts.

## Current scripts

- `bootstrap.mjs`: verifies repo-root usage, checks dependencies, and prints
  the canonical local commands

## Recommended usage

From the repo root:

```bash
npm run bootstrap
```

Then use the repo-local fallback commands when needed:

```bash
npm exec pnpm dev
npm exec pnpm lint
npm exec pnpm test
npm exec pnpm build
```

The `scripts/` directory is intentionally small. Product logic belongs in
`src/domain` and `src/integrations`, not shell helpers.
