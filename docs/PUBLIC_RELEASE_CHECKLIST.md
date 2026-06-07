# Public Release Checklist

Advertising-supported operation is commercial use. Do not release until every
required item is checked and evidence is retained.

## Required before public release

- [ ] Independent reviewer confirms the clean implementation was not copied from
      GitReverse or the earlier internal derivative.
- [ ] Independent reviewer signs `docs/CLEAN_ROOM_REPORT.md`.
- [ ] Qualified counsel reviews the intended public and advertising-supported
      use.
- [ ] Public product name passes a formal trademark and brand clearance.
- [x] MIT license added for the clean-room codebase.
- [ ] Dependency license inventory and required notices are reviewed.
- [ ] Supabase schema is applied to a separate production project and its RLS
      posture is verified.
- [ ] Provider, GitHub, and database secrets are stored only server-side.
- [x] Privacy policy explains repository processing, logs, analytics, cookies,
      and advertising.
- [ ] Advertising provider terms and consent requirements are implemented for
      the target countries.
- [x] Basic production abuse controls and rate limits are implemented.

## Technical evidence already produced

- Fresh Git repository and root commit.
- Independent external behavior specification.
- Preserved reference and derivative Git bundles.
- Zero byte-identical files in the latest path audit.
- No cross-project source clone found by the latest `jscpd` audit.
- Automated tests, lint, build, and live 9router generation verification.
