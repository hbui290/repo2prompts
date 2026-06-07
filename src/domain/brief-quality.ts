import { requiredHeadings, type AnalysisDepth, type AnalysisMode } from "./brief-prompt";

export type BriefQuality = {
  passed: boolean;
  warnings: string[];
  repaired: boolean;
};

const MINIMUM_LENGTH: Record<AnalysisDepth, number> = {
  fast: 500,
  balanced: 900,
  focused: 900,
  deep: 1400,
};

export function validateBriefQuality(input: {
  brief: string;
  mode: AnalysisMode;
  depth: AnalysisDepth;
  selectedPaths: string[];
  repaired?: boolean;
}): BriefQuality {
  const warnings: string[] = [];
  for (const heading of requiredHeadings(input.mode)) {
    if (!input.brief.includes(`# ${heading}`)) warnings.push(`Missing required heading: ${heading}`);
  }
  if (input.brief.length < MINIMUM_LENGTH[input.depth]) {
    warnings.push(`Brief is shorter than the ${input.depth} quality minimum.`);
  }
  const selected = new Set(input.selectedPaths);
  const normalizePath = (path: string) => path.replace(/^\.\//u, "");
  const sourcePath = /\.(?:tsx?|jsx?|py|go|rs|java|rb|php|vue|svelte|md|json|toml|ya?ml|sql)$/iu;
  const citations = [...input.brief.matchAll(/\[([^\]\n]+)\]/gu)]
    .flatMap((match) => match[1]?.split(",").map((path) => normalizePath(path.trim())) ?? [])
    .filter((path) => selected.has(path) || sourcePath.test(path));
  if (selected.size && citations.length === 0) warnings.push("Brief has no source-file citation.");
  for (const citation of citations) {
    if (!selected.has(citation)) warnings.push(`Invalid citation: ${citation}`);
  }
  const mentionedPaths = [...input.brief.matchAll(/`([^`\n]+)`/gu)]
    .map((match) => match[1])
    .filter((path): path is string => Boolean(path));
  for (const path of mentionedPaths) {
    const normalized = normalizePath(path);
    const looksLikeRepositoryPath = (path.startsWith("./") || path.includes("/")) && sourcePath.test(path);
    if (looksLikeRepositoryPath && !selected.has(normalized)) {
      warnings.push(`Unsupported fabricated file path: ${path}`);
    }
  }
  if (!/unknown|inference/iu.test(input.brief)) warnings.push("Brief does not identify inference or unknowns.");
  return { passed: warnings.length === 0, warnings: [...new Set(warnings)], repaired: input.repaired ?? false };
}
