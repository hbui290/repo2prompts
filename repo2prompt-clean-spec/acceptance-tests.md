# Repo Brief Generator Acceptance Tests

## Input validation

- `vercel/next.js` is accepted.
- `https://github.com/vercel/next.js` is accepted.
- Non-GitHub URLs are rejected.
- Focused analysis without a question is rejected.

## Fast analysis

- Reads repository metadata, README, and relevant manifests.
- Returns a Markdown brief with purpose, capabilities, architecture, plan, and
  verification sections.
- Marks unsupported conclusions as inferences.

## Thorough analysis

- Reads a bounded set of source files selected by an original scoring policy.
- Reports file and tree-entry counts.
- Produces more implementation detail than fast analysis.
- Does not exceed configured context limits.

## Focused analysis

- Uses the user's question as the organizing constraint.
- Still identifies relevant evidence and unknowns.

## Cache and library

- Repeating the same request returns a cached result.
- Different focused questions use different cache entries.
- Library listing returns readable titles and summaries.
- Search falls back to text mode when embeddings are unavailable.

## Security and operations

- Browser bundles contain no provider, GitHub, or database secret.
- Status endpoint returns no secret values.
- App can generate a brief when the database is disabled.
- All public error messages are actionable and omit internal stack traces.

