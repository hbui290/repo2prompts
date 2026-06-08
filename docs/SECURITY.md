# Security

This document describes the practical security boundary for Repo2Prompts.

## Security model

Repo2Prompts is a server-side application that reads public GitHub repositories,
selects repository evidence, and generates report artifacts through a configured
model backend.

Security assumptions:

- model credentials stay server-side
- optional database service credentials stay server-side
- browser clients do not receive privileged tokens
- generated output is assistive, not automatically trusted

Repo2Prompts is not a sandbox, malware scanner, or formal code-security review
system.

## Secrets and credentials

Keep these values server-only:

- `MODEL_API_KEY`
- `GITHUB_API_TOKEN`
- `DATABASE_SERVICE_KEY`

Rules:

- never place provider keys in `NEXT_PUBLIC_*` variables
- never commit secrets into tracked files
- prefer env injection or host-level secret management
- rotate any token that is exposed in logs, commits, screenshots, or chat

Browser-visible variables should contain only public URLs or public
configuration.

## Generated output boundary

Generated briefs may contain incorrect, incomplete, or unsupported inferences.
Users should verify important claims against cited source evidence before acting
on them.

This is especially important for:

- architecture decisions
- migration plans
- security-sensitive changes
- production runbooks
- dependency or license conclusions

## GitHub access

GitHub access is limited to repository metadata, tree traversal, and selected
readable file collection needed for report generation.

Recommendations:

- use the narrowest GitHub token possible
- prefer read-only access where write access is not needed
- avoid sharing a broad personal token across unrelated deployments

## Rate limiting and abuse control

`POST /api/briefs` supports an in-memory limiter by default.

Config:

- `RATE_LIMIT_BACKEND`, default `memory`
- `RATE_LIMIT_WINDOW_MS`, default `600000`
- `RATE_LIMIT_MAX`, default `10`
- `RATE_LIMIT_DB_FAILURE_MODE`, default `open`

Guidance:

- use `memory` for small single-instance or hobby deployments
- use `database` for public multi-instance deployments after applying the
  `rate_limit_events` migration
- place a WAF, reverse proxy limiter, or Redis-backed limiter in front for
  larger deployments

When `RATE_LIMIT_DB_FAILURE_MODE=open`, limiter outages allow requests through
and emit a safe warning log. Use `closed` only when abuse prevention matters
more than availability.

The database limiter stores a hash of the request key, not the raw IP address.

## Database access

The optional brief library is read server-side through the configured service
key.

Do not expose direct browser access to `repository_briefs` unless all of the
following are true:

- reviewed RLS policies exist
- grants are intentionally scoped
- the public data model has been audited

## Evidence handling

Repo2Prompts reduces unnecessary context by selecting evidence instead of
dumping the whole repository, but this is not a guarantee that sensitive content
will never be selected.

Operational advice:

- avoid pointing the app at repositories you are not comfortable processing
- review selection rules before enabling public usage
- treat exported JSON and Markdown as potentially sensitive if the source repo
  is sensitive

## Abuse response

If the service receives abusive traffic or a suspected key exposure occurs:

1. Lower `RATE_LIMIT_MAX`.
2. Rotate model, GitHub, and database credentials as needed.
3. Disable generation temporarily by removing `MODEL_API_KEY`.
4. Review hosting, proxy, and provider logs.
5. Re-check recent commits and environment files for accidental secret storage.

## Disclosure

If you discover a real security issue in Repo2Prompts itself, do not open a
public exploit issue with live secrets or a working attack chain. Share a
minimal reproducible report with sanitized evidence and impacted versions.
