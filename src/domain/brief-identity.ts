import { createHash } from "node:crypto";

import type { AnalysisDepth, AnalysisMode } from "./brief-prompt";

export type BriefIdentity = {
  repositoryKey: string;
  mode: AnalysisMode;
  depth: AnalysisDepth;
  questionHash: string;
};

export function createBriefIdentity(
  repositoryKey: string,
  mode: AnalysisMode,
  depth: AnalysisDepth,
  question: string | null,
): BriefIdentity {
  return {
    repositoryKey,
    mode,
    depth,
    questionHash:
      depth === "focused" && question
        ? createHash("sha256").update(question.trim()).digest("hex")
        : "none",
  };
}
