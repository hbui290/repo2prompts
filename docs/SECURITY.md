# Security

## Secrets

Keep these values server-only:

- `MODEL_API_KEY`
- `GITHUB_API_TOKEN`
- `DATABASE_SERVICE_KEY`

Never place provider keys or service-role database keys in `NEXT_PUBLIC_*`
variables. Browser-visible variables should only contain public URLs or public
configuration.

## Rate limiting

`POST /api/briefs` uses an in-memory rate limit:

- `RATE_LIMIT_BACKEND`, default `memory`
- `RATE_LIMIT_WINDOW_MS`, default `600000`
- `RATE_LIMIT_MAX`, default `10`
- `RATE_LIMIT_DB_FAILURE_MODE`, default `open`

This protects small self-hosted and hobby deployments from accidental API
overuse. For public multi-instance production, set `RATE_LIMIT_BACKEND=database`
after applying the `rate_limit_events` migration. The database limiter stores a
hash of the request key, not the raw IP address. A provider-level WAF or Redis
limiter is also appropriate for larger deployments.

When `RATE_LIMIT_DB_FAILURE_MODE=open`, database limiter outages allow requests
through and emit a safe warning log. Use `closed` only if abuse prevention is
more important than availability.

## Database access

The brief library is read server-side through the configured service key. Do not
grant browser clients direct access to `repository_briefs` unless you also add
reviewed RLS policies and grants.

## Generated content

Generated briefs may contain incorrect or unsupported inferences. The UI and
legal pages state that generated output must be verified against source
evidence.

## Abuse response

If the service receives abusive traffic:

1. Lower `RATE_LIMIT_MAX`.
2. Rotate provider and database keys if exposure is suspected.
3. Disable generation temporarily by removing `MODEL_API_KEY`.
4. Review hosting and provider logs.
