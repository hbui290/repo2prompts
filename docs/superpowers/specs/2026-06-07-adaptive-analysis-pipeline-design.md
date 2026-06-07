# Repo2Prompts Adaptive Analysis Pipeline Design

## Summary

Phase 2 upgrades brief quality by replacing the current single-pass analysis with an adaptive pipeline. Fast requests remain lightweight. Balanced, focused, and deep requests progressively add repository mapping, module analysis, citations, and output validation.

The product remains a repository-to-agent-brief tool. It will not become a full source-code indexer, AST platform, or unrestricted multi-agent system.

## Goals

- Make `deep` materially deeper than simply reading more files.
- Improve selected-file relevance for each analysis mode and focused question.
- Identify modules, entrypoints, integrations, data flows, tests, and migrations.
- Require file citations for important generated claims.
- Separate observed evidence, inference, and unknowns.
- Reuse repository analysis across modes through an evidence-fingerprint cache.
- Keep latency and model cost predictable for each depth.

## Non-Goals

- No full AST parser or language server integration.
- No embeddings for source-code retrieval in this phase.
- No GitHub issues, pull requests, commit history, or changelog ingestion.
- No analysis of private/local repositories.
- No unbounded agent loops or unbounded parallel model calls.
- No support promise for every programming language beyond path-based fallback behavior.

## Pipeline By Depth

### Fast

Flow:

```text
repository tree
→ deterministic ranking
→ read up to 7 files
→ one brief-writer model call
→ citation and heading validation
```

Fast mode prioritizes latency. It does not generate or cache a repository map.

### Balanced

Flow:

```text
repository tree
→ deterministic classification and ranking
→ read up to 20 files
→ one repository-analyst model call
→ one brief-writer model call
→ quality validation
```

Balanced is the default quality mode. The repository analyst creates a structured map which is cached and reused for subsequent analysis modes when the evidence fingerprint is unchanged.

### Focused

Flow:

```text
focused question
→ keyword extraction
→ question-aware file ranking
→ read up to 20 relevant files
→ one focused repository-analyst call
→ one brief-writer call
→ quality validation
```

Focused analysis creates a question-specific map and must not replace the general repository map cache.

### Deep

Flow:

```text
repository tree
→ deterministic classification and relationship graph
→ group files into bounded modules
→ read up to 35 files
→ analyze up to 6 modules in parallel
→ merge module results into repository map
→ one brief-writer call
→ quality validation and one repair call if required
```

Limits:

- Maximum 6 analyzed modules.
- Maximum 8 files per module.
- Maximum 35 total source files.
- Maximum one repair call.
- Module analysis concurrency: 3.

## Evidence Fingerprint

Every analysis calculates a stable evidence fingerprint before checking caches.

Fingerprint inputs:

- Normalized repository key.
- Resolved Git ref or default branch.
- Optional repository subpath.
- Selected file paths.
- Selected file blob SHAs.
- Include/exclude filters.
- Selection policy version.

The GitHub tree response must retain each blob SHA. The fingerprint uses SHA-256 over a stable JSON representation sorted by path.

The fingerprint changes when:

- Selected source content changes.
- Branch/ref changes.
- Filters change.
- Selection algorithm version changes.

It does not change for metadata such as stars.

## File Classification

Each file receives one deterministic role:

```ts
type FileRole =
  | "documentation"
  | "manifest"
  | "configuration"
  | "entrypoint"
  | "route"
  | "ui"
  | "service"
  | "data"
  | "integration"
  | "test"
  | "migration"
  | "generated"
  | "unknown";
```

Classification uses path, filename, and extension. A small content sample may only be used after a file has already passed security filtering.

Examples:

- `README.md` → `documentation`
- `package.json` → `manifest`
- `app/api/users/route.ts` → `route`
- `components/user-card.tsx` → `ui`
- `lib/auth.ts` → `service`
- `supabase/migrations/*.sql` → `migration`

## Mode-Aware Ranking

Each candidate file receives a score:

```text
final score =
  base role score
  + mode score
  + question score
  + relationship score
  + diversity score
  - size penalty
```

Mode behavior:

- `build`: favors documentation, manifests, entrypoints, routes, UI, services, and data.
- `review`: favors core source, tests, configuration, security-sensitive integrations, and large/highly referenced files.
- `debug`: favors runtime entrypoints, routes, services, error-handling files, tests, and configuration.
- `migration`: favors manifests, configuration, integrations, data/migrations, entrypoints, and dependency boundaries.
- `prompt`: favors documentation, manifests, and representative entrypoints.

Diversity rule:

- Do not spend the entire context budget on one folder when other relevant roles exist.
- Reserve at least one slot for documentation/manifest and one for tests in `review` or `debug`, when available.

## Focused Question Ranking

Focused analysis extracts normalized keywords from the user's question:

- Lowercase.
- Remove common stop words.
- Keep identifiers and technical terms.
- Expand a small deterministic synonym map:
  - `authentication` → `auth`, `login`, `session`, `oauth`, `token`, `user`
  - `database` → `db`, `sql`, `schema`, `migration`, `query`
  - `api` → `route`, `endpoint`, `request`, `response`

Question score increases when keywords occur in:

- File path.
- Export/import names.
- First content sample.
- Files referenced by a keyword-matching file.

The question and derived keywords are stored in evidence metadata but do not expose source content.

## Lightweight Relationship Graph

The pipeline builds a best-effort graph without adding an AST dependency.

Supported signals:

- JavaScript/TypeScript `import`, dynamic `import()`, and `require()`.
- Python `import` and `from ... import`.
- Relative path relationships.
- Route/path naming.
- Environment variable names.
- Database table names found in SQL and common query calls.

Graph types:

```ts
type EvidenceGraph = {
  nodes: Array<{ path: string; role: FileRole }>;
  edges: Array<{
    from: string;
    to: string;
    kind: "import" | "route" | "database" | "environment" | "path";
  }>;
};
```

Unresolved imports are ignored. The graph is advisory and must not be presented as certain evidence unless supported by a concrete path/file citation.

## Module Grouping

Modules are created deterministically before model calls.

Grouping priority:

1. Closely connected files in the relationship graph.
2. Shared top-level source folder.
3. Shared role and filename keywords.

Each module includes:

```ts
type RepositoryModule = {
  id: string;
  name: string;
  files: string[];
  roles: FileRole[];
  estimatedTokens: number;
};
```

Modules exceeding the per-module file or token budget are trimmed by ranking score. Small leftover modules are merged into an `Other core files` module.

## Structured Repository Map

Repository analyst calls must return JSON, not Markdown.

```ts
type EvidenceClaim = {
  claim: string;
  files: string[];
  confidence: "observed" | "inferred";
};

type RepositoryMap = {
  purpose: EvidenceClaim[];
  entrypoints: EvidenceClaim[];
  modules: Array<{
    name: string;
    responsibility: string;
    files: string[];
    claims: EvidenceClaim[];
  }>;
  dataFlows: EvidenceClaim[];
  integrations: EvidenceClaim[];
  risks: EvidenceClaim[];
  unknowns: string[];
};
```

Validation rules:

- Every cited file must exist in selected evidence.
- Claims without valid files are downgraded to `inferred`.
- Invalid JSON causes one structured retry for analyst calls.
- If the retry fails, the pipeline falls back to deterministic evidence summary and continues to the writer.

## Deep Module Analysis

Each module analyst receives:

- Repository metadata.
- Module name and file roles.
- Relationship edges touching the module.
- File contents for that module.

It returns the repository-map subset for that module. The merger:

- Deduplicates claims by normalized text.
- Unions valid citation files.
- Preserves unknowns.
- Does not invent cross-module flows.

The final writer receives the merged map and representative source excerpts, not every full module response plus all source code.

## Brief Writer And Citations

The final brief remains Markdown and keeps the current mode-specific heading contract.

Citation syntax:

```text
[src/app/page.tsx]
[src/lib/auth.ts, src/app/api/session/route.ts]
```

Rules:

- Important architecture, data-flow, integration, and risk claims require citations.
- Citations must reference selected evidence files.
- Inferred statements must be explicitly labelled `Inference`.
- Missing evidence must appear under unknowns.

Fast mode uses source evidence directly. Balanced, focused, and deep use the repository map plus selected representative excerpts.

## Quality Gate

Quality validation is deterministic and runs after the writer returns Markdown.

Checks:

- Required top-level headings are present.
- Brief is above a mode-specific minimum length.
- At least one citation exists when files were read.
- Every cited path exists in selected evidence.
- Unknowns/inference section exists.
- Output does not contain unsupported fabricated file paths.

Repair policy:

- Fast: do not call repair; return output with a quality warning in response metadata.
- Balanced/focused: one repair call only for missing headings or invalid citations.
- Deep: one repair call for any failed quality check.
- If repair fails, return the original brief with warnings rather than failing the request.

## Model Client Interfaces

Replace the single-purpose `requestBrief(prompt)` interface with:

```ts
type ModelTask =
  | "repository_analysis"
  | "module_analysis"
  | "brief_writing"
  | "brief_repair";

requestModelText(task: ModelTask, prompt: string): Promise<string>;
requestModelJson<T>(task: ModelTask, prompt: string): Promise<T>;
```

Configuration:

- `MODEL_CHAT_ID` remains the default model.
- Optional `MODEL_ANALYSIS_ID` overrides analyst/module calls.
- Optional `MODEL_WRITER_ID` overrides writer/repair calls.
- Existing OpenAI-compatible endpoint and API key remain unchanged.

All model requests use:

- Abort timeout.
- Non-streaming response.
- At most one retry for malformed analyst JSON.
- No logging of source content or secrets.

Defaults:

- Request timeout: 90 seconds.
- Deep module concurrency: 3.
- No automatic retry for HTTP provider failures.

## Caching And Database

### Repository Map Cache

Add table:

```sql
repository_analysis_cache (
  id uuid primary key,
  repository_key text not null,
  resolved_ref text not null,
  repository_path text not null default '',
  evidence_fingerprint text not null,
  scope text not null check (scope in ('general', 'focused', 'deep')),
  question_hash text not null default 'none',
  repository_map jsonb not null,
  evidence_json jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (
    repository_key,
    resolved_ref,
    repository_path,
    evidence_fingerprint,
    scope,
    question_hash
  )
)
```

RLS is enabled. No anon/authenticated policies are added. The server service key remains the only application access path.

### Final Brief Cache

Add `evidence_fingerprint text not null default 'legacy'` to `repository_briefs`.

Replace final brief unique key with:

```text
repository_key
+ analysis_mode
+ analysis_depth
+ question_hash
+ evidence_fingerprint
```

Existing rows keep fingerprint `legacy` and remain readable in Library, but they are not reused for new generated requests.

## API Response

`POST /api/briefs` keeps existing fields and adds:

```ts
analysis: {
  pipeline: "single_pass" | "repository_map" | "module_map";
  repositoryMapSource: "generated" | "cache" | "not_used";
  modulesAnalyzed: number;
  evidenceFingerprint: string;
  quality: {
    passed: boolean;
    warnings: string[];
    repaired: boolean;
  };
}
```

The UI may display:

- Pipeline used.
- Number of modules analyzed.
- Whether repository map came from cache.
- Quality warnings.

Internal model prompts, raw model JSON, and full source contents are never returned to the browser.

## Failure Handling

- GitHub metadata/tree failure: return current GitHub error response.
- Individual file read failure: skip file and record `read_failed` as a supported evidence skip reason returned to the UI.
- No readable evidence: return a clear `NO_EVIDENCE` error before model calls.
- Analyst malformed JSON after retry: use deterministic fallback map.
- Module call failure: retain successful module results and record an unknown.
- Writer failure: return model unavailable error; do not save incomplete final brief.
- Quality repair failure: return original brief with warnings.
- Database cache failure: continue generation without cache and do not fail the user request.

## Implementation Boundaries

Suggested responsibilities:

- `domain/file-analysis.ts`: classification, keyword extraction, relationship graph, module grouping.
- `domain/repository-map.ts`: repository-map validation, deterministic fallback, module-map merge.
- `domain/brief-quality.ts`: heading/citation/quality validation.
- `integrations/analysis-pipeline.ts`: adaptive orchestration and bounded concurrency.
- Existing GitHub reader, model client, brief store, API route, and workbench consume these units.

No single new module should combine deterministic analysis, model orchestration, database storage, and UI response shaping.

## Testing

Unit tests:

- File role classification across representative paths.
- Mode-aware ranking favors expected roles.
- Focused keyword expansion and ranking.
- Relationship extraction for TypeScript and Python.
- Module grouping respects limits.
- Evidence fingerprint is stable and changes on blob SHA/filter/policy changes.
- Repository-map validator rejects fabricated citations.
- Module merger deduplicates claims.
- Quality gate detects missing headings, invalid citations, and short output.

Pipeline tests with mocked model/GitHub/store:

- Fast uses one writer call and no repository-map cache.
- Balanced generates then caches a general repository map.
- Balanced reuses cached repository map on second mode request.
- Focused uses question-specific map.
- Deep limits module count and concurrency, merges partial success, then writes brief.
- Analyst malformed JSON retries once and falls back.
- Quality repair is called at most once.
- Database failure does not fail generation.

Runtime verification:

- Generate `fast`, `balanced`, `deep`, and `focused` briefs for a small public repository.
- Confirm deep analyzes modules and includes valid citations.
- Confirm repeated balanced request uses repository-map cache.
- Confirm modified ref/fingerprint does not reuse stale cache.
- Confirm existing Library rows remain readable.
- Run `pnpm test`, `pnpm lint`, and `pnpm build`.

## Rollout Order

1. Deterministic file analysis and evidence fingerprint.
2. Repository-map types, validation, fallback, and quality gate.
3. General/focused repository-map pipeline.
4. Deep module grouping and bounded module analysis.
5. Model-client task interfaces and adaptive pipeline orchestration.
6. Repository-map and fingerprint database migrations.
7. API response metadata and UI status display.
8. Runtime quality comparison and documentation.

## Acceptance Criteria

- Fast remains a single model call.
- Balanced and focused use a structured repository map before brief writing.
- Deep analyzes bounded modules and produces a merged repository map.
- Briefs contain valid source-file citations.
- Important unsupported conclusions are labelled as inference or unknown.
- Repeated analyses reuse repository-map cache only when evidence fingerprint matches.
- Model and database failures degrade according to the documented policy.
- Existing cached briefs remain visible but are not reused as fresh analyses.
- All tests, lint, and production build pass.
