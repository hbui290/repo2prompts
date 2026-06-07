import type { AnalysisDepth, AnalysisMode } from "./brief-prompt";

export type FileRole =
  | "documentation"
  | "manifest"
  | "configuration"
  | "entrypoint"
  | "route"
  | "ui"
  | "service"
  | "data"
  | "integration"
  | "test"
  | "migration"
  | "generated"
  | "unknown";

export type AnalyzableFile = {
  path: string;
  size: number;
  sha: string;
  content?: string;
};

export type RankedEvidenceFile = AnalyzableFile & {
  role: FileRole;
  score: number;
  reason: string;
  estimatedTokens: number;
};

const STOP_WORDS = new Set(["a", "an", "and", "does", "how", "is", "of", "the", "to", "use", "what"]);
const SYNONYMS: Record<string, string[]> = {
  authentication: ["auth", "login", "session", "oauth", "token", "user"],
  auth: ["authentication", "login", "session", "oauth", "token", "user"],
  database: ["db", "sql", "schema", "migration", "query"],
  api: ["route", "endpoint", "request", "response"],
};

export function classifyFile(path: string): FileRole {
  const lower = path.toLowerCase();
  if (/(^|\/)(dist|build|coverage|generated|\.next|out)\//u.test(lower)) return "generated";
  if (/(^|\/)(readme|contributing|architecture)(\.|$)/u.test(lower)) return "documentation";
  if (/(^|\/)(package\.json|pyproject\.toml|cargo\.toml|go\.mod|composer\.json)$/u.test(lower)) return "manifest";
  if (/(^|\/)(supabase\/)?migrations?\//u.test(lower) || /\.sql$/u.test(lower)) return "migration";
  if (/\.(test|spec)\./u.test(lower) || /(^|\/)tests?\//u.test(lower)) return "test";
  if (/(^|\/)(routes?|api)\//u.test(lower) || /(^|\/)route\.[a-z0-9]+$/u.test(lower)) return "route";
  if (/(^|\/)(components?|ui|views?)\//u.test(lower) || /\.(tsx|jsx|vue|svelte)$/u.test(lower)) return "ui";
  if (/(^|\/)(main|index|app|server)\.[a-z0-9]+$/u.test(lower)) return "entrypoint";
  if (/(^|\/)(config|configs?)\//u.test(lower) || /\.(json|ya?ml|toml)$/u.test(lower)) return "configuration";
  if (/(^|\/)(db|data|models?|schemas?)\//u.test(lower)) return "data";
  if (/(^|\/)(integrations?|adapters?|clients?)\//u.test(lower)) return "integration";
  if (/(^|\/)(lib|services?|server)\//u.test(lower)) return "service";
  return "unknown";
}

export function extractQuestionKeywords(question: string | null | undefined): string[] {
  const words = question?.toLowerCase().match(/[a-z0-9_-]{2,}/gu) ?? [];
  const result = new Set<string>();
  for (const word of words) {
    if (STOP_WORDS.has(word)) continue;
    result.add(word);
    for (const synonym of SYNONYMS[word] ?? []) result.add(synonym);
  }
  return [...result];
}

export function shortlistLimit(depth: AnalysisDepth): number {
  if (depth === "fast") return 25;
  if (depth === "deep") return 120;
  return 70;
}

export function finalEvidenceLimit(depth: AnalysisDepth): number {
  if (depth === "fast") return 7;
  if (depth === "deep") return 35;
  return 20;
}

const ROLE_BASE: Record<FileRole, number> = {
  documentation: 100,
  manifest: 95,
  configuration: 55,
  entrypoint: 90,
  route: 75,
  ui: 55,
  service: 65,
  data: 60,
  integration: 60,
  test: 35,
  migration: 50,
  generated: -100,
  unknown: 15,
};

const MODE_ROLES: Record<AnalysisMode, FileRole[]> = {
  build: ["entrypoint", "route", "ui", "service", "data"],
  review: ["service", "configuration", "integration", "test"],
  debug: ["entrypoint", "route", "service", "test", "configuration"],
  migration: ["manifest", "configuration", "integration", "data", "migration"],
  prompt: ["documentation", "manifest", "entrypoint"],
};

export function rankEvidenceFiles(
  files: AnalyzableFile[],
  options: { mode: AnalysisMode; depth: AnalysisDepth; question?: string | null },
): RankedEvidenceFile[] {
  const keywords = extractQuestionKeywords(options.question);
  return files
    .map((file) => {
      const role = classifyFile(file.path);
      const searchable = `${file.path}\n${file.content?.slice(0, 12_000) ?? ""}`.toLowerCase();
      const questionHits = keywords.filter((keyword) => searchable.includes(keyword)).length;
      const score =
        ROLE_BASE[role] +
        (MODE_ROLES[options.mode].includes(role) ? 35 : 0) +
        questionHits * 45 -
        Math.floor(file.size / 40_000) * 8;
      return {
        ...file,
        role,
        score,
        reason: `${role}${questionHits ? `, ${questionHits} question signal(s)` : ""}`,
        estimatedTokens: Math.ceil((file.content?.length ?? file.size) / 4),
      };
    })
    .filter((file) => file.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
}
