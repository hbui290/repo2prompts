import type { StoredBrief } from "@/integrations/brief-store";

export type ExampleReport = StoredBrief & {
  slug: string;
  summary: string;
};

const now = "2026-06-08T00:00:00.000Z";

export const EXAMPLE_REPORTS: ExampleReport[] = [
  {
    id: "example-nextjs-build",
    slug: "nextjs-build-brief",
    repository_key: "acme/next-dashboard",
    analysis_mode: "build",
    analysis_depth: "balanced",
    evidence_fingerprint: "example-nextjs-balanced",
    title: "Next.js dashboard build brief",
    summary: "A build-focused brief for turning a dashboard repository into an agent implementation plan.",
    created_at: now,
    view_count: 0,
    evidence_json: {
      filesRead: 18,
      treeEntries: 142,
      estimatedTokens: 12_400,
      selectedFiles: [
        { path: "app/page.tsx", reason: "application entrypoint", estimatedTokens: 980 },
        { path: "app/api/reports/route.ts", reason: "API route", estimatedTokens: 760 },
        { path: "lib/db.ts", reason: "data access", estimatedTokens: 520 },
      ],
      skippedFiles: [{ path: ".env.local", reason: "sensitive path" }],
      largestFiles: [{ path: "components/report-table.tsx", estimatedTokens: 1_840 }],
      analysis: {
        pipeline: "repository_map",
        repositoryMapSource: "generated",
        modulesAnalyzed: 0,
        evidenceFingerprint: "example-nextjs-balanced",
        quality: { passed: true, warnings: [], repaired: false },
      },
    },
    brief_markdown: `# Product purpose
Build an internal dashboard that lists report records, exposes report detail pages, and lets operators trigger refresh jobs. Evidence points to the primary UI in [app/page.tsx], report API behavior in [app/api/reports/route.ts], and database access in [lib/db.ts].

# Observed evidence
- [app/page.tsx] renders the dashboard shell and table controls.
- [app/api/reports/route.ts] accepts report refresh requests.
- [lib/db.ts] centralizes database queries.

# Architecture and data flow
The app reads report rows through the database helper, renders them in a table, and calls the report API route for refresh actions. Inference: background job execution is not fully visible in the selected files.

# Implementation sequence
- Stabilize the report table state.
- Add loading and error states around refresh actions.
- Add route-level validation for report IDs.

# Verification plan
- Test empty, loading, and failed refresh states.
- Test API validation for invalid report IDs.

# Inferences and unknowns
The selected evidence does not show authentication or production job scheduling.`,
  },
  {
    id: "example-supabase-review",
    slug: "supabase-review-brief",
    repository_key: "acme/supabase-portal",
    analysis_mode: "review",
    analysis_depth: "deep",
    evidence_fingerprint: "example-supabase-review",
    title: "Supabase portal review brief",
    summary: "A review-mode report focused on auth, RLS, maintainability, and missing tests.",
    created_at: now,
    view_count: 0,
    evidence_json: {
      filesRead: 31,
      treeEntries: 204,
      estimatedTokens: 22_900,
      selectedFiles: [
        { path: "middleware.ts", reason: "auth boundary", estimatedTokens: 620 },
        { path: "supabase/migrations/001_init.sql", reason: "database schema", estimatedTokens: 1_240 },
        { path: "app/account/page.tsx", reason: "user workflow", estimatedTokens: 900 },
      ],
      skippedFiles: [{ path: "supabase/.branches/_current_branch", reason: "generated file" }],
      largestFiles: [{ path: "supabase/migrations/001_init.sql", estimatedTokens: 1_240 }],
      analysis: {
        pipeline: "module_map",
        repositoryMapSource: "generated",
        modulesAnalyzed: 4,
        evidenceFingerprint: "example-supabase-review",
        quality: { passed: true, warnings: [], repaired: false },
      },
    },
    brief_markdown: `# Architecture summary
The portal combines Next.js pages, Supabase Auth middleware, and SQL migrations. The most important trust boundary is [middleware.ts], while table shape and policy risk live in [supabase/migrations/001_init.sql].

# High-risk areas
- Confirm RLS policies cover every user-owned table in [supabase/migrations/001_init.sql].
- Check account page data reads in [app/account/page.tsx] for server-side user validation.

# Missing tests
No selected evidence shows tests for auth redirects or RLS failure cases.

# Review checklist
- Verify RLS for read/write paths.
- Add auth redirect tests.
- Validate account page cannot read another user's data.

# Inferences and unknowns
Inference: deployment secrets are configured outside this repo because no production env files were selected.`,
  },
  {
    id: "example-action-debug",
    slug: "github-action-debug-brief",
    repository_key: "acme/action-runner",
    analysis_mode: "debug",
    analysis_depth: "focused",
    evidence_fingerprint: "example-action-debug",
    title: "GitHub Action debug brief",
    summary: "A focused debug brief for diagnosing failed workflow artifact uploads.",
    created_at: now,
    view_count: 0,
    evidence_json: {
      filesRead: 11,
      treeEntries: 88,
      estimatedTokens: 7_800,
      selectedFiles: [
        { path: ".github/workflows/ci.yml", reason: "workflow config", estimatedTokens: 740 },
        { path: "scripts/upload-artifact.ts", reason: "focused question match", estimatedTokens: 860 },
      ],
      skippedFiles: [],
      largestFiles: [{ path: "scripts/upload-artifact.ts", estimatedTokens: 860 }],
      analysis: {
        pipeline: "repository_map",
        repositoryMapSource: "generated",
        modulesAnalyzed: 0,
        evidenceFingerprint: "example-action-debug",
        quality: { passed: true, warnings: [], repaired: false },
      },
    },
    brief_markdown: `# Runtime path summary
The workflow in [.github/workflows/ci.yml] runs a script that uploads generated artifacts through [scripts/upload-artifact.ts].

# Likely failure areas
- Artifact path mismatch between workflow output and script input.
- Missing permissions for workflow artifact write.

# Symptoms / suspected causes
- Upload failure likely occurs after artifact generation but before artifact persistence.
- The resolved artifact path may not match the workflow output directory.
- Workflow token permissions may be too narrow for artifact writes.

# Diagnostic steps
- Print the resolved artifact path before upload.
- Confirm workflow permissions include actions write access.
- Check whether the file exists before the upload call.

# Minimal fixes
- Normalize the artifact path in [scripts/upload-artifact.ts].
- Add a workflow step that lists output directory contents.

# Inferences and unknowns
The selected evidence does not include the failing run logs.`,
  },
  {
    id: "example-cli-migration",
    slug: "cli-migration-brief",
    repository_key: "acme/repo-cli",
    analysis_mode: "migration",
    analysis_depth: "balanced",
    evidence_fingerprint: "example-cli-migration",
    title: "CLI migration brief",
    summary: "A migration report for moving a repository CLI from ad hoc parsing to typed commands.",
    created_at: now,
    view_count: 0,
    evidence_json: {
      filesRead: 15,
      treeEntries: 119,
      estimatedTokens: 10_300,
      selectedFiles: [
        { path: "src/index.ts", reason: "CLI entrypoint", estimatedTokens: 780 },
        { path: "src/options.ts", reason: "option parsing", estimatedTokens: 530 },
        { path: "package.json", reason: "manifest", estimatedTokens: 420 },
      ],
      skippedFiles: [{ path: "dist/index.js", reason: "generated file" }],
      largestFiles: [{ path: "src/index.ts", estimatedTokens: 780 }],
      analysis: {
        pipeline: "repository_map",
        repositoryMapSource: "generated",
        modulesAnalyzed: 0,
        evidenceFingerprint: "example-cli-migration",
        quality: { passed: true, warnings: [], repaired: false },
      },
    },
    brief_markdown: `# Current architecture
The CLI starts in [src/index.ts], reads option definitions from [src/options.ts], and exposes the executable through [package.json].

# Migration target assumptions
Move parsing into typed command modules while preserving the current command flags.

# Phased migration plan
- Extract command option parsing from [src/index.ts].
- Add typed command handlers.
- Keep the current executable name from [package.json].
- Add tests for existing flags before changing behavior.

# Rollback plan
Keep the old parser behind a temporary compatibility entrypoint until command tests pass.

# Risks and unknowns
The selected evidence does not show integration tests for shell invocation.`,
  },
];

export function exampleBySlug(slug: string): ExampleReport | null {
  return EXAMPLE_REPORTS.find((report) => report.slug === slug) ?? null;
}
