import { createHash } from "node:crypto";

import type { AnalysisDepth } from "./brief-prompt";

export type BriefIdentity = {
  repositoryKey: string;
  depth: AnalysisDepth;
  questionHash: string;
};

export function createBriefIdentity(
  repositoryKey: string,
  depth: AnalysisDepth,
  question: string | null,
): BriefIdentity {
  return {
    repositoryKey,
    depth,
    questionHash:
      depth === "focused" && question
        ? createHash("sha256").update(question.trim()).digest("hex")
        : "none",
  };
}

