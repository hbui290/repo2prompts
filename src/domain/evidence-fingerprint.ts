import { createHash } from "node:crypto";

export const SELECTION_POLICY_VERSION = "adaptive-v1";

export function createEvidenceFingerprint(input: {
  repositoryKey: string;
  resolvedRef: string;
  repositoryPath: string;
  include?: string;
  exclude?: string;
  files: Array<{ path: string; sha: string }>;
}): string {
  const stable = {
    repositoryKey: input.repositoryKey,
    resolvedRef: input.resolvedRef,
    repositoryPath: input.repositoryPath,
    include: input.include?.trim() ?? "",
    exclude: input.exclude?.trim() ?? "",
    policyVersion: SELECTION_POLICY_VERSION,
    files: [...input.files].sort((a, b) => a.path.localeCompare(b.path)),
  };
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}
