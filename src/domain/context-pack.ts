import type { AnalysisDepth, AnalysisMode } from "./brief-prompt";
import type { RepositoryEvidence } from "@/integrations/github-reader";

export type ContextPackInput = {
  repository: string;
  mode: AnalysisMode;
  depth: AnalysisDepth;
  question: string | null;
  include?: string;
  exclude?: string;
  evidence: RepositoryEvidence;
};

export type ContextPack = {
  repository: string;
  mode: AnalysisMode;
  depth: AnalysisDepth;
  question: string | null;
  include?: string;
  exclude?: string;
  generatedAt: string;
  resolvedRef: string;
  repositoryPath: string;
  evidenceFingerprint: string;
  metadata: RepositoryEvidence["metadata"];
  stats: {
    filesRead: number;
    treeEntries: number;
    selectedFiles: number;
    skippedFiles: number;
    estimatedTokens: number;
  };
  selectedFiles: Array<{
    path: string;
    size: number;
    score: number;
    reason: string;
    estimatedTokens: number;
  }>;
  skippedFiles: Array<{
    path: string;
    size: number;
    reason: string;
  }>;
  largestFiles: Array<{
    path: string;
    size: number;
    estimatedTokens: number;
  }>;
  safetyWarnings: string[];
};

export type ContextPackExportFormat = "markdown" | "json";

function safetyWarnings(evidence: RepositoryEvidence): string[] {
  const warnings = new Set<string>();
  for (const file of evidence.selection.skipped) {
    if (file.reason === "suspicious_secret") {
      warnings.add("Sensitive-looking paths or content were excluded.");
    }
    if (file.reason === "too_large") {
      warnings.add("Large files were excluded or summarized by metadata only.");
    }
    if (file.reason === "read_failed") {
      warnings.add("Some candidate files could not be read from GitHub.");
    }
  }
  return [...warnings];
}

export function buildContextPack(input: ContextPackInput): ContextPack {
  const selectedFiles = input.evidence.selection.selected.map((file) => ({
    path: file.path,
    size: file.size,
    score: file.score,
    reason: file.reason,
    estimatedTokens: file.estimatedTokens,
  }));
  const skippedFiles = input.evidence.selection.skipped.map((file) => ({
    path: file.path,
    size: file.size,
    reason: file.reason,
  }));

  return {
    repository: input.repository,
    mode: input.mode,
    depth: input.depth,
    question: input.question,
    include: input.include,
    exclude: input.exclude,
    generatedAt: new Date().toISOString(),
    resolvedRef: input.evidence.resolvedRef,
    repositoryPath: input.evidence.repositoryPath,
    evidenceFingerprint: input.evidence.evidenceFingerprint,
    metadata: input.evidence.metadata,
    stats: {
      filesRead: input.evidence.files.length,
      treeEntries: input.evidence.treeEntries,
      selectedFiles: selectedFiles.length,
      skippedFiles: skippedFiles.length,
      estimatedTokens: input.evidence.selection.estimatedTokens,
    },
    selectedFiles,
    skippedFiles,
    largestFiles: input.evidence.selection.largestFiles.map((file) => ({
      path: file.path,
      size: file.size,
      estimatedTokens: file.estimatedTokens,
    })),
    safetyWarnings: safetyWarnings(input.evidence),
  };
}

function listFiles(
  files: Array<{ path: string; reason?: string; estimatedTokens?: number; size?: number }>,
): string {
  if (!files.length) return "- None recorded.";
  return files
    .slice(0, 12)
    .map((file) => {
      const meta = [
        file.reason,
        file.estimatedTokens ? `${file.estimatedTokens} tokens` : null,
        file.size ? `${file.size} bytes` : null,
      ].filter(Boolean).join(" · ");
      return `- ${file.path}${meta ? ` — ${meta}` : ""}`;
    })
    .join("\n");
}

export function buildContextPackExport(
  pack: ContextPack,
  format: ContextPackExportFormat,
): string {
  if (format === "json") {
    return JSON.stringify(pack, null, 2);
  }

  return `# Repo2Prompts Context Pack

Repository: ${pack.repository}
Mode: ${pack.mode}
Depth: ${pack.depth}
Resolved ref: ${pack.resolvedRef}
Evidence fingerprint: ${pack.evidenceFingerprint}

## Stats
- Files read: ${pack.stats.filesRead}
- Tree entries: ${pack.stats.treeEntries}
- Selected files: ${pack.stats.selectedFiles}
- Skipped files: ${pack.stats.skippedFiles}
- Estimated tokens: ${pack.stats.estimatedTokens}

## Selected Files
${listFiles(pack.selectedFiles)}

## Skipped Files
${listFiles(pack.skippedFiles)}

## Largest Files
${listFiles(pack.largestFiles)}

## Safety Warnings
${pack.safetyWarnings.length ? pack.safetyWarnings.map((warning) => `- ${warning}`).join("\n") : "- None recorded."}
`;
}
