# Examples

Repo2Prompts ships with example flows that make it easier to inspect the
product without configuring a model provider first.

## In the app

- `/examples`: static example entrypoint
- `/library`: stored and example report views
- `/workbench`: advanced analysis surface

## Example report types

- `build`
- `review`
- `debug`
- `migration`

## Recommended smoke path

1. Run `npm exec pnpm dev`
2. Open the homepage
3. Visit `/examples` or `/library`
4. Compare the generated or static report against `docs/REPORT_VISUAL_SMOKE.md`
