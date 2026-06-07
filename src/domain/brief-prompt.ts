export type AnalysisDepth = "fast" | "thorough" | "focused";

type BriefContext = {
  repositoryKey: string;
  depth: AnalysisDepth;
  question: string | null;
  metadata: {
    description: string | null;
    language: string | null;
    stars: number;
  };
  files: Array<{ path: string; content: string }>;
  treeEntries: number;
};

export function buildBriefPrompt(context: BriefContext): string {
  const fileEvidence = context.files
    .map(({ path, content }) => `\n--- ${path} ---\n${content}`)
    .join("\n");

  return `You are preparing an implementation brief for a coding agent.

Repository: ${context.repositoryKey}
Analysis depth: ${context.depth}
Focused question: ${context.question ?? "none"}
Description: ${context.metadata.description ?? "not provided"}
Primary language: ${context.metadata.language ?? "unknown"}
Stars: ${context.metadata.stars}
Tree entries observed: ${context.treeEntries}

Use only the repository evidence below. Label unsupported conclusions as
"Inference" and identify missing information explicitly.

Return Markdown with these exact top-level headings:
# Product purpose
# Observed evidence
# User-visible capabilities
# Architecture and data flow
# External integrations
# Implementation sequence
# Verification plan
# Inferences and unknowns

Repository evidence:
${fileEvidence || "No readable files were collected."}`;
}

