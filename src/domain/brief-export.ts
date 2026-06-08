export type ExportFormat = "markdown" | "codex" | "cursor" | "claude" | "evidence-json";

type EvidenceFile = {
  path?: unknown;
  reason?: unknown;
  estimatedTokens?: unknown;
  size?: unknown;
};

type BriefExportInput = {
  repository?: string;
  mode?: string;
  depth?: string;
  brief: string;
  evidence?: {
    selectedFiles?: EvidenceFile[];
    skippedFiles?: EvidenceFile[];
    largestFiles?: EvidenceFile[];
    readiness?: {
      score?: number;
      label?: string;
      confidence?: string;
      improvements?: string[];
      bestNextPrompt?: string;
      verificationCommands?: string[];
      safety?: { level?: string; warnings?: string[]; disclaimer?: string };
    };
    analysis?: {
      quality?: { passed?: boolean; warnings?: string[]; repaired?: boolean };
    };
  };
};

function safeFiles(files: EvidenceFile[] | undefined): Array<Record<string, unknown>> {
  return (files ?? []).map((file) => ({
    path: typeof file.path === "string" ? file.path : "",
    reason: typeof file.reason === "string" ? file.reason : undefined,
    estimatedTokens: typeof file.estimatedTokens === "number" ? file.estimatedTokens : undefined,
    size: typeof file.size === "number" ? file.size : undefined,
  }));
}

function fileList(files: EvidenceFile[] | undefined): string {
  const rows = safeFiles(files).filter((file) => file.path);
  return rows.length
    ? rows.map((file) => `- ${file.path}${file.reason ? ` (${file.reason})` : ""}`).join("\n")
    : "- none recorded";
}

function warnings(input: BriefExportInput): string {
  const rows = input.evidence?.analysis?.quality?.warnings ?? [];
  return rows.length ? rows.map((warning) => `- ${warning}`).join("\n") : "- none recorded";
}

function readiness(input: BriefExportInput): string {
  const data = input.evidence?.readiness;
  if (!data || typeof data.score !== "number") return "Agent Readiness: not recorded";
  const improvements = data.improvements?.length
    ? data.improvements.map((item) => `- ${item}`).join("\n")
    : "- none recorded";
  const commands = data.verificationCommands?.length
    ? data.verificationCommands.map((command) => `- ${command}`).join("\n")
    : "- No clear verification command found.";
  const safetyWarnings = data.safety?.warnings?.length
    ? data.safety.warnings.map((warning) => `- ${warning}`).join("\n")
    : "- none recorded";
  return `Agent Readiness: ${data.score}/100 - ${data.label ?? "Unknown"}
Confidence: ${data.confidence ?? "unknown"}
Safety: ${data.safety?.level ?? "unknown"}

## Improvement Checklist

${improvements}

## Best Next Agent Prompt

${data.bestNextPrompt ?? "No prompt recorded."}

## Verification Commands

${commands}

## Safety Warnings

${safetyWarnings}`;
}

function metadata(input: BriefExportInput): string {
  return `Repository: ${input.repository ?? "unknown"}
Mode: ${input.mode ?? "unknown"}
Depth: ${input.depth ?? "unknown"}`;
}

function agentExport(input: BriefExportInput, title: string): string {
  return `# ${title}

${metadata(input)}

## Agent Readiness

${readiness(input)}

## Selected Evidence

${fileList(input.evidence?.selectedFiles)}

## Skipped Evidence

${fileList(input.evidence?.skippedFiles)}

## Quality Warnings

${warnings(input)}

## Brief

${input.brief}`;
}

export function buildBriefExport(input: BriefExportInput, format: ExportFormat): string {
  if (format === "evidence-json") {
    return JSON.stringify({
      selectedFiles: safeFiles(input.evidence?.selectedFiles),
      skippedFiles: safeFiles(input.evidence?.skippedFiles),
      largestFiles: safeFiles(input.evidence?.largestFiles),
      readiness: input.evidence?.readiness ?? null,
      analysis: input.evidence?.analysis ?? null,
    }, null, 2);
  }

  if (format === "codex") return agentExport(input, "Repo2Prompts Codex Handoff");
  if (format === "cursor") return agentExport(input, "Repo2Prompts Cursor Brief");
  if (format === "claude") return agentExport(input, "Repo2Prompts Claude Brief");
  return input.brief;
}
