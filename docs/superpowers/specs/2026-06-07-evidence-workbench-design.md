# Repo2Prompts Evidence Workbench Design

## Summary

Repo2Prompts will evolve from a simple repository-to-brief form into an evidence-driven workbench. The product will still focus on generating agent-ready implementation briefs, not cloning repository packers such as Repomix, Gitingest, or repo2txt.

The upgrade adds three practical capabilities:

- Show what repository evidence was used.
- Let users steer what files are included or excluded.
- Make generated briefs easy to copy, download, export, and revisit.

This design intentionally keeps the first implementation small. CLI, MCP, browser extensions, local private repo upload, desktop wrappers, and full Repomix-style packing are out of scope for this phase.

## Goals

- Make the first screen understandable: paste a GitHub repo, choose analysis style, generate a useful brief.
- Make output trustworthy by showing selected files, skipped files, evidence counts, and approximate context size.
- Improve user control through include and exclude filters.
- Improve output utility through copy, Markdown download, and JSON evidence export.
- Improve generated brief quality through explicit analysis modes.
- Add lightweight security filtering so obvious secrets and generated/build artifacts are not sent to the model.
- Preserve the clean-room/public-ready posture of the current repo.

## Non-Goals

- Do not copy source code, UI copy, logos, docs, or visual design from competitor repositories.
- Do not build a full repository packing engine.
- Do not support local/private repository upload in this phase.
- Do not add new framework dependencies.
- Do not add CLI, MCP, VS Code extension, browser extension, GitHub Action, or desktop app yet.
- Do not change the hosted database schema unless the existing table cannot store the required evidence metadata.

## Product Shape

The homepage becomes a single workbench with two main areas:

1. Request panel:
   - Repository input.
   - Sample repo shortcuts.
   - Analysis mode selector.
   - Depth selector.
   - Advanced filters for include and exclude patterns.

2. Result panel:
   - Generated brief.
   - Evidence summary.
   - Selected files.
   - Skipped files and reasons.
   - Output actions: copy brief, download Markdown, export JSON.

The UI should remain dark/cyberpunk-inspired if the current visual direction requires it, but the workbench must prioritize readability and trust over decorative noise.

## Analysis Modes

The current `depth` field is not enough. Add a separate `mode` field:

- `build`: Generate an agent-ready build brief.
- `review`: Generate a code review and risk brief.
- `debug`: Generate a debugging and failure-mode plan.
- `migration`: Generate a migration/refactor plan.
- `prompt`: Generate a concise prompt for another coding agent.

Depth remains:

- `fast`: Small context, fastest response.
- `balanced`: More files, default for quality.
- `deep`: Most files allowed by policy in this phase.
- `focused`: Requires a user question and uses that question to rank files.

The request API accepts both fields:

```ts
type BriefRequest = {
  repository: string;
  mode?: "build" | "review" | "debug" | "migration" | "prompt";
  depth?: "fast" | "balanced" | "deep" | "focused";
  question?: string;
  include?: string;
  exclude?: string;
};
```

Backward compatibility:

- Existing requests without `mode` default to `build`.
- Existing requests with `depth: "thorough"` map to `balanced`.

## Repository Input

The repository parser should support:

- `owner/repo`
- `https://github.com/owner/repo`
- `https://github.com/owner/repo/tree/branch`
- `https://github.com/owner/repo/tree/branch/path/to/folder`

Branch/path support can be introduced in the parser and GitHub reader without making the UI complex. If branch/path parsing is too large for the first code pass, the UI may still accept the URL but the API must clearly report unsupported branch/path instead of silently analyzing the wrong root.

## Context Selection

The GitHub reader already collects metadata and recursive tree data, then reads selected files. The upgraded context policy should return a richer object:

```ts
type ContextSelection = {
  selected: Array<{
    path: string;
    size: number;
    score: number;
    reason: string;
    estimatedTokens: number;
  }>;
  skipped: Array<{
    path: string;
    size: number;
    reason:
      | "empty"
      | "too_large"
      | "ignored_directory"
      | "generated_or_build"
      | "test_file"
      | "excluded_by_user"
      | "not_included_by_user"
      | "suspicious_secret"
      | "low_relevance";
  }>;
  totalTreeEntries: number;
  estimatedTokens: number;
  largestFiles: Array<{ path: string; size: number; estimatedTokens: number }>;
};
```

Selection rules:

- Always favor README and project metadata files.
- Favor entrypoints, app routes, source files, config files, API handlers, and library modules.
- Lower priority for tests unless mode is `review` or `debug`.
- Exclude `node_modules`, `.next`, `.git`, `dist`, `build`, `coverage`, generated folders, binary-like assets, and oversized files.
- Exclude obvious secret files and content patterns from model context.
- Apply user include/exclude filters after default safety filters. User filters may narrow context, but must not override security exclusions.

Estimated token count can be approximate. A simple `Math.ceil(characters / 4)` estimate is acceptable for this phase.

## Include And Exclude Filters

The advanced filter UI accepts comma-separated glob-like patterns:

```text
include: src/**, app/**, package.json
exclude: **/*.test.ts, dist/**, node_modules/**
```

Pattern support should be deliberately simple:

- `*` matches one path segment fragment.
- `**` matches across path segments.
- Exact paths match exactly.
- Empty filter means no user filter.

No new glob dependency is required unless a simple local matcher becomes unreliable.

Validation:

- Trim spaces.
- Ignore empty entries.
- Limit each field to a reasonable length such as 1000 characters.
- Return a clear API error for invalid pattern syntax.

## Security Guard

Security guard is lightweight and deterministic:

Skip files by path if they match:

- `.env`, `.env.*`
- private key names
- secret credential names
- common generated secrets file names

Skip file content if a sampled section contains obvious secret markers:

- `-----BEGIN PRIVATE KEY-----`
- `GITHUB_TOKEN=`
- `OPENAI_API_KEY=`
- `SUPABASE_SERVICE_ROLE_KEY=`
- long `sk-` style tokens

The app should not show secret values. The UI can say:

```text
Skipped 2 files because they looked sensitive.
```

## API Response

`POST /api/briefs` should return:

```ts
type BriefResponse = {
  brief: string;
  source: "generated" | "cache";
  mode: "build" | "review" | "debug" | "migration" | "prompt";
  depth: "fast" | "balanced" | "deep" | "focused";
  evidence: {
    filesRead: number;
    treeEntries: number;
    estimatedTokens: number;
    selectedFiles: Array<{
      path: string;
      size: number;
      reason: string;
      estimatedTokens: number;
    }>;
    skippedFiles: Array<{
      path: string;
      reason: string;
    }>;
    largestFiles: Array<{
      path: string;
      size: number;
      estimatedTokens: number;
    }>;
  };
};
```

Cache compatibility:

- Existing cached rows may only contain `filesRead` and `treeEntries`.
- The UI must render old cached rows gracefully.
- New cached rows should store the richer evidence JSON in the existing `evidence_json` column if possible.

## Prompt Design

`buildBriefPrompt` should accept `mode`, `depth`, `question`, metadata, selected evidence, and context selection summary.

Each mode gets a different heading contract:

- `build`: product purpose, capabilities, architecture, data flow, implementation sequence, verification, unknowns.
- `review`: architecture summary, high-risk areas, correctness risks, maintainability risks, missing tests, review checklist.
- `debug`: suspected failure areas, runtime paths, diagnostic steps, logs/signals to collect, minimal fixes, verification.
- `migration`: current architecture, migration target assumptions, dependency map, phased plan, risks, rollback plan.
- `prompt`: concise agent prompt, repo evidence summary, task instructions, constraints, unknowns.

All modes must explicitly separate:

- Evidence observed from files.
- Inferences.
- Unknowns.

## Frontend UX

Request panel:

- Repository input placeholder: `owner/repo or https://github.com/owner/repo`.
- Helper text: public GitHub repositories only.
- Sample repo buttons fill the input.
- Mode selector uses short labels and descriptions.
- Depth selector explains speed vs quality.
- Focus question field only appears for focused depth.
- Advanced filters can be collapsed by default.

Result panel:

- Empty state shows a realistic sample, not generic placeholder text.
- Generated state shows action bar:
  - Copy brief.
  - Download Markdown.
  - Export evidence JSON.
- Evidence section shows:
  - Files read.
  - Tree entries.
  - Estimated tokens.
  - Selected file list.
  - Skipped file list with reasons.

Mobile:

- Request and result panels stack vertically.
- File lists should scroll or wrap, not overflow horizontally.
- Buttons wrap into two rows if needed.

## Library

The library list should continue to work with current data.

Add a detail page:

```text
/library/[id]
```

The detail page should show:

- Repository key.
- Title.
- Created date.
- View count.
- Brief Markdown.
- Evidence summary if available.
- Copy/download/export actions.

If the database is not configured or a brief cannot be found, return a readable empty/error state.

## Testing

Unit tests:

- Repository parser supports owner/repo and GitHub URL forms.
- Context policy ranks core files above low-value files.
- Include/exclude filters select expected files.
- Security guard skips sensitive paths/content.
- Prompt builder emits different heading contracts for each mode.
- Chat completion parser behavior remains unchanged.
- Rate limiter behavior remains unchanged.

API tests or focused integration tests:

- `POST /api/briefs` accepts old request shape.
- `POST /api/briefs` accepts new `mode`, `include`, `exclude`.
- Cached old evidence renders without crashing.
- Invalid focused request still requires a question.

Manual verification:

- `pnpm test`
- `pnpm lint`
- `pnpm build`
- Open `/`
- Generate a brief for a small public repo.
- Verify copy/download/export actions.
- Open `/library`
- Open a library detail page.

## Rollout Order

1. Domain types and context policy tests.
2. Include/exclude matcher and security guard.
3. GitHub evidence collection response shape.
4. Prompt modes.
5. API request/response compatibility.
6. Workbench UI.
7. Library detail page.
8. Docs update.

This order keeps the backend contract stable before UI work and allows each step to be verified with focused tests.

## Acceptance Criteria

- A user can paste a public GitHub repo and generate a brief.
- The response shows selected files, skipped files, tree entries, and estimated tokens.
- Include/exclude filters change selected files in a predictable way.
- Obvious secret files are skipped and never sent to the model.
- Users can copy the brief, download Markdown, and export evidence JSON.
- New modes produce noticeably different brief structures.
- Existing cached briefs still render.
- `/library/[id]` displays stored brief details.
- `pnpm test`, `pnpm lint`, and `pnpm build` pass.

