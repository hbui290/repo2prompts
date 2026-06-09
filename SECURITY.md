# Security Policy

Repo2Prompts accepts responsible vulnerability reports for supported versions of
the current `main` branch and the latest tagged release, when releases exist.

## Supported versions

| Version | Supported |
| --- | --- |
| `main` | Yes |
| Latest release | Yes |
| Older snapshots | No |

## Reporting a vulnerability

Do not open a public GitHub issue for a suspected vulnerability.

Use this order:

1. If private vulnerability reporting is enabled for this repository, use the
   GitHub security reporting flow.
2. Otherwise contact the maintainer privately through the repository owner's
   GitHub profile: <https://github.com/hbui290>
3. Include `repo2prompts security report` in the message title and provide:
   - affected commit, branch, or version
   - reproduction steps
   - impact assessment
   - suggested remediation if available

## Response expectations

- Initial acknowledgment target: within 5 business days
- Best-effort remediation updates: as triage completes
- Public disclosure: only after a fix or mitigation path exists

## Scope notes

Repo2Prompts is a server-side evidence and prompt generation tool. Reports may
include incorrect inferences, but output quality problems alone are not treated
as security vulnerabilities unless they create a concrete confidentiality,
integrity, or availability risk.

For operational boundaries, secret handling, rate limiting, and abuse-response
detail, see [`docs/SECURITY.md`](./docs/SECURITY.md).
