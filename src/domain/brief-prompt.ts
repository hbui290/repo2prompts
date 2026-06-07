import type { ContextSelection } from "./context-policy";

export type AnalysisMode = "build" | "review" | "debug" | "migration" | "prompt";
export type AnalysisDepth = "fast" | "balanced" | "deep" | "focused";

type BriefContext = {
  repositoryKey: string;
  mode: AnalysisMode;
  depth: AnalysisDepth;
  question: string | null;
  metadata: {
    description: string | null;
    language: string | null;
    stars: number;
  };
  files: Array<{ path: string; content: string }>;
  treeEntries: number;
  selection?: ContextSelection;
};

const HEADINGS: Record<AnalysisMode, string[]> = {
  build: [
    "Product purpose",
    "Observed evidence",
    "User-visible capabilities",
    "Architecture and data flow",
    "External integrations",
    "Implementation sequence",
    "Verification plan",
    "Inferences and unknowns",
  ],
  review: [
    "Architecture summary",
    "Observed evidence",
    "High-risk areas",
    "Correctness risks",
    "Maintainability risks",
    "Missing tests",
    "Review checklist",
    "Inferences and unknowns",
  ],
  debug: [
    "Runtime path summary",
    "Observed evidence",
    "Likely failure areas",
    "Diagnostic steps",
    "Minimal fixes",
    "Verification plan",
    "Inferences and unknowns",
  ],
  migration: [
    "Current architecture",
    "Observed evidence",
    "Migration target assumptions",
    "Dependency map",
    "Phased migration plan",
    "Rollback plan",
    "Risks and unknowns",
  ],
  prompt: [
    "Agent prompt",
    "Repository evidence summary",
    "Task instructions",
    "Constraints",
    "Unknowns",
  ],
};

export function requiredHeadings(mode: AnalysisMode): string[] {
  return HEADINGS[mode];
}

export function normalizeAnalysisMode(value: unknown): AnalysisMode {
  return value === "review" ||
    value === "debug" ||
    value === "migration" ||
    value === "prompt"
    ? value
    : "build";
}

export function normalizeAnalysisDepth(value: unknown): AnalysisDepth {
  if (value === "fast" || value === "focused" || value === "deep" || value === "balanced") {
    return value;
  }
  if (value === "thorough") return "balanced";
  return "balanced";
}

function selectionSummary(selection: ContextSelection | undefined): string {
  if (!selection) return "No selection summary was recorded.";
  const selected = selection.selected
    .map((file) => `- ${file.path} (${file.estimatedTokens} est. tokens; ${file.reason})`)
    .join("\n");
  const skipped = selection.skipped
    .slice(0, 30)
    .map((file) => `- ${file.path} (${file.reason})`)
    .join("\n");

  return `Selected files:
${selected || "- none"}

Skipped files:
${skipped || "- none"}

Estimated context tokens: ${selection.estimatedTokens}`;
}

export function buildBriefPrompt(context: BriefContext): string {
  const fileEvidence = context.files
    .map(({ path, content }) => `\n--- ${path} ---\n${content}`)
    .join("\n");
  const headings = HEADINGS[context.mode].map((heading) => `# ${heading}`).join("\n");

  return `You are preparing a ${context.mode} brief for a coding agent.

Repository: ${context.repositoryKey}
Analysis mode: ${context.mode}
Analysis depth: ${context.depth}
Focused question: ${context.question ?? "none"}
Description: ${context.metadata.description ?? "not provided"}
Primary language: ${context.metadata.language ?? "unknown"}
Stars: ${context.metadata.stars}
Tree entries observed: ${context.treeEntries}

Use only the repository evidence below. Label unsupported conclusions as
"Inference" and identify missing information explicitly.
Cite important architecture, data-flow, integration, and risk claims using the
exact evidence path in square brackets, for example [src/app.ts].

Return Markdown with these exact top-level headings:
${headings}

Context selection summary:
${selectionSummary(context.selection)}

Repository evidence:
${fileEvidence || "No readable files were collected."}`;
}
