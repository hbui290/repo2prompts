# Clean-Room Audit Report

Audit date: 2026-06-07

## Compared repositories

- Reference repository: `filiksyos/gitreverse`
- Reference commit: `c96cbe1e3aba67d3c078870ca6629b28c177dba4`
- Clean implementation working directory: `repo2prompt-clean`
- Clean root commit: `ff460ec`

## Process

- Preserved the reference and internal derivative as Git bundles outside this
  repository.
- Wrote an independent product, API, data, and acceptance specification outside
  both source repositories.
- Initialized this repository from the official `create-next-app` generator.
- Implemented repository parsing, evidence selection, GitHub reading, provider
  parsing, API behavior, prompts, copy, and UI as new work.
- Did not copy the earlier database schema, cache, library, authentication,
  payment, prompt, asset, or route implementations.

## Automated audit results

Path and byte comparison, excluding Git metadata, dependencies, build output,
environment secrets, and lockfiles:

```text
Clean files: 49
Reference files: 85
Common paths: 8
Byte-identical files: 0
```

`jscpd` clone detection with a threshold of 5 lines and 50 tokens found no
cross-project source-code clone. Its 28 reported clones were internal
duplications within the reference repository. The standard `create-next-app`
generated `tsconfig.json` was split into project-specific files after an earlier
audit identified it as a framework-boilerplate match.

## Remaining restrictions

- This report is a technical audit, not a legal opinion.
- An independent reviewer who did not implement this repository must inspect
  source, prompts, copy, assets, and architecture before public release.
- Public release and outbound licensing remain blocked until that review is
  recorded.
- Advertising-supported operation is commercial use and requires the same
  release gate.
- `Repo2Prompts` is the intended product name selected by the owner. Complete
  formal brand/trademark clearance before publishing.
- Public-readiness additions include MIT license text, privacy and terms pages,
  deployment/security documentation, and server-side request rate limiting.
