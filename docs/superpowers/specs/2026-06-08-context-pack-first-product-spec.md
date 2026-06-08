# Repo2Prompts Context Pack First Product Spec

## Summary

Current Repo2Prompts is now a usable evidence-backed report generator, but it has drifted away from the most important feature family shown by the reference bundle: users first need a trustworthy, inspectable context pack before asking an agent to act.

The strongest references are `gitingest`, `repo2txt`, `code2prompt`, and `repomix`. They win on short input flow, file tree visibility, token accounting, manual selection, multi-format output, local/private entrypoints, and integration surfaces. Repo2Prompts already wins on analysis quality, readiness scoring, risks, checks, and agent-specific handoff. The next product step is to combine both: **context pack first, report second**.

Recommended positioning:

> Build the repo context pack first. Then generate the agent handoff from evidence.

## Source Comparison

| Source | What It Proves | Current Gap In Repo2Prompts | Product Lesson |
| --- | --- | --- | --- |
| `PROJECT_SPEC.md` | Original product is repository intelligence, not only a landing/report shell. | Current UI hides evidence selection behind Advanced and jumps straight to report generation. | Restore the workbench as an inspectable context builder inside the Home flow. |
| `gitingest` reference | Extremely short GitHub URL to digest flow, shareable output, CLI/package distribution. | Repo2Prompts has good reports, but no raw prompt-friendly digest artifact and no shortcut entrypoint. | Add copyable context pack output and later URL shortcut/CLI. |
| `repo2txt` reference | Browser-based file tree, provider sources, local files/zip, token stats, privacy-first UX. | Repo2Prompts supports only public GitHub URL in browser and has no file tree preview. | Add file tree preview, token budget, and local/zip/private repo roadmap. |
| `code2prompt` reference | Templates, token count, line numbers, syntax mapping, interactive selection. | Repo2Prompts exports fixed formats and has no template/profile layer. | Add output profiles and template-like export modes without changing the analysis core. |
| `repomix` reference | Multi-format pack, deep ignore/config, compression, MCP/browser extension ecosystem. | Repo2Prompts has evidence JSON but no first-class pack formats or agent integration surface. | Add Markdown/XML/JSON context pack exports, then MCP/browser extension later. |

## Key Product Change

### 1. Add A Context Pack Preview Before Report Generation

Home should become a two-step flow:

1. **Build context pack**
   - User enters GitHub repo.
   - App reads tree and produces selected/skipped/largest files.
   - UI shows file tree summary, token estimate, selected evidence, skipped reasons, and safety warnings.
   - User can adjust report type, scan depth, focused question, include/exclude filters.
2. **Generate agent handoff**
   - User clicks `Generate report`.
   - Existing `/api/briefs` pipeline uses the chosen context settings.
   - Result remains the current report/readiness/export artifact.

This keeps the current generator but makes the evidence layer visible before model spend.

### 2. Promote Context Pack As A First-Class Artifact

Every run should produce two outputs:

- **Context pack:** deterministic selected repository evidence, tree summary, token counts, skipped reasons, and safe copy/export formats.
- **Agent report:** model-written brief with readiness, risks, checks, truth table, and handoff.

The context pack should be usable even when model generation fails. This is important because competitors already solve “give me repo context for my LLM” without requiring model calls.

### 3. Add File Tree And Token Budget Controls

Replace the current hidden text-only `Scope filters` feeling with a real context control panel:

- File category chips: `docs`, `config`, `source`, `tests`, `routes`, `ci`, `package`.
- Selected file list with token estimates and reasons.
- Skipped file list grouped by reason: generated, oversized, unsafe, low relevance, filtered.
- Token budget presets: `Small`, `Standard`, `Large`.
- Manual include/exclude remains available, but as advanced text fields under the visual controls.

Do not add a full explorer for every file in P0. Start with selected/skipped/largest lists and category counts. Add full tree selection in P1.

### 4. Add Context Pack Exports

Add exports alongside existing Codex/Cursor/Claude exports:

- `Copy context pack`
- `Download context.md`
- `Download context.json`
- `Copy report + context bundle`

Suggested `context.json` shape:

```ts
type ContextPackExport = {
  repository: string;
  resolvedRef: string;
  repositoryPath: string;
  mode: AnalysisMode;
  depth: AnalysisDepth;
  question?: string;
  tokenEstimate: number;
  selectedFiles: Array<{
    path: string;
    reason: string;
    estimatedTokens: number;
    role?: string;
  }>;
  skippedFiles: Array<{
    path: string;
    reason: string;
    size?: number;
  }>;
  safetyWarnings: string[];
  generatedAt: string;
};
```

No full source content should be included in JSON exports unless a later explicit setting enables it. Default exports should stay safe and evidence-indexed.

### 5. Add New API Without Breaking `/api/briefs`

Keep `/api/briefs` unchanged for existing generation.

Add:

```text
POST /api/context-pack
```

Input:

```ts
{
  repository: string;
  mode?: "build" | "review" | "debug" | "migration" | "prompt";
  depth?: "fast" | "balanced" | "deep" | "focused";
  question?: string;
  include?: string;
  exclude?: string;
}
```

Output:

```ts
{
  repository: string;
  resolvedRef: string;
  repositoryPath: string;
  metadata: RepositoryEvidence["metadata"];
  treeEntries: number;
  contextPack: ContextPackExport;
  evidenceFingerprint: string;
}
```

Implementation should reuse `collectRepositoryEvidence`, not create a second GitHub reader.

### 6. Preserve Current Report Work

Do not throw away the current report UX. The report is the differentiator after the context pack:

- Readiness score
- Truth / inferred / unknown
- Risk areas
- Checks
- Agent handoff
- Export actions

But the landing page and Home generator should stop implying the model report is the only product. The product should visibly produce repo context first.

## Phasing

### P0: Restore The Missing Core

- Add `/api/context-pack`.
- Add context pack preview panel on Home after repo input.
- Add selected/skipped/largest evidence summary with token estimate.
- Add context pack Markdown/JSON exports.
- Keep current report generation as the second action.
- Update landing copy from “Generate report” only to “Build context pack” then “Generate report”.

### P1: Power User Controls

- Add visual category filters.
- Add file tree preview with select/deselect for selected candidates.
- Add token budget presets.
- Add output profile selector: `Agent handoff`, `Raw context`, `Review pack`, `Debug pack`.
- Add line-number and code-block export options if safe.

### P2: Distribution And Integrations

- Browser extension or bookmarklet from GitHub repo pages.
- CLI command for local/private repositories.
- MCP server or tool endpoint for agents to request context packs.
- GitHub Action to refresh context pack/readiness badge on push.
- Local zip upload or browser-only local mode if privacy becomes a key differentiator.

## Success Criteria

- A user can get useful context even if model generation is unavailable.
- The first result after entering a repo is inspectable evidence, not only a model-written report.
- User can see selected files, skipped files, token estimate, and safety warnings before report generation.
- Context pack exports are copy-ready and safe by default.
- `/api/briefs`, `/api/status`, stored reports, and existing report pages remain compatible.
- Harness matrix gets a new story for context pack preview and export.

## Non-Goals For This Slice

- Do not implement private repo OAuth in P0.
- Do not build a full IDE-style file browser in P0.
- Do not add payments, auth, dashboard accounts, or analytics.
- Do not rewrite the stack.
- Do not replace the report artifact with a raw packer. The packer is the evidence layer; the report is the analysis layer.

## Recommended First Implementation Story

Create story:

```text
US-CTX-005 Context pack preview and export
```

Contract:

> Users can enter a public GitHub repo, build an inspectable context pack with selected/skipped evidence and token estimate, copy/download that pack, then generate the existing evidence-backed report from the same settings.

Verification:

- `POST /api/context-pack` returns selected/skipped/largest evidence and token estimate.
- Home shows context pack preview before report generation.
- Context pack Markdown and JSON exports omit full source content and secrets.
- Existing `/api/briefs` generation still works.
- `npm test`, `npm run lint`, `npm run build` pass.
