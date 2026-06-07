import type { AnalysisMode, AnalysisDepth } from "./brief-prompt";

export type RepositoryFile = {
  path: string;
  size: number;
};

export type SkippedReason =
  | "empty"
  | "too_large"
  | "ignored_directory"
  | "generated_or_build"
  | "test_file"
  | "excluded_by_user"
  | "not_included_by_user"
  | "suspicious_secret"
  | "read_failed"
  | "low_relevance";

export type SelectedContextFile = RepositoryFile & {
  score: number;
  reason: string;
  estimatedTokens: number;
};

export type SkippedContextFile = RepositoryFile & {
  reason: SkippedReason;
};

export type ContextSelection = {
  selected: SelectedContextFile[];
  skipped: SkippedContextFile[];
  totalTreeEntries: number;
  estimatedTokens: number;
  largestFiles: Array<{ path: string; size: number; estimatedTokens: number }>;
};

export type ContextSelectionOptions = {
  depth?: AnalysisDepth;
  mode?: AnalysisMode;
  include?: string;
  exclude?: string;
  limit?: number;
};

const MAX_FILE_BYTES = 120_000;
const FILTER_MAX_LENGTH = 1000;

function estimateTokensFromBytes(bytes: number): number {
  return Math.ceil(bytes / 4);
}

export function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

function parsePatterns(input: string | undefined): string[] {
  if (!input?.trim()) return [];
  if (input.length > FILTER_MAX_LENGTH) {
    throw new Error("Filter patterns must be 1000 characters or less.");
  }
  return input
    .split(",")
    .map((pattern) => pattern.trim())
    .filter(Boolean);
}

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/gu, "\\$&");
}

function globToRegex(pattern: string): RegExp {
  if (!/^[A-Za-z0-9_./*{}@!+ -]+$/u.test(pattern)) {
    throw new Error("Filter patterns may only contain paths, spaces, *, and **.");
  }

  const parts = pattern.match(/\*\*|\*|[^*]+/gu) ?? [];
  const source = parts
    .map((part) => {
      if (part === "**") return ".*";
      if (part === "*") return "[^/]*";
      return escapeRegex(part);
    })
    .join("");

  return new RegExp(`^${source}$`, "u");
}

function matchesAny(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (path === pattern) return true;
    return globToRegex(pattern).test(path);
  });
}

export function hasSensitivePath(path: string): boolean {
  const lower = path.toLowerCase();
  return (
    /(^|\/)\.env(\.|$)/u.test(lower) ||
    /(^|\/)(id_rsa|id_dsa|id_ecdsa|id_ed25519|private[-_]?key)/u.test(lower) ||
    /(^|\/).*(secret|credential|service[-_]?role|token).*\.(json|ya?ml|toml|env|txt)$/u.test(lower)
  );
}

export function hasSensitiveContent(content: string): boolean {
  const sample = content.slice(0, 20_000);
  return (
    /-----BEGIN (RSA |DSA |EC |OPENSSH |)?PRIVATE KEY-----/u.test(sample) ||
    /\b(GITHUB_TOKEN|OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY)=/u.test(sample) ||
    /\bsk-[A-Za-z0-9_-]{24,}\b/u.test(sample)
  );
}

function scorePath(path: string, mode: AnalysisMode): { score: number; reason: string } {
  const lower = path.toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  if (/(^|\/)(readme|contributing|architecture)(\.|$)/u.test(lower)) {
    score += 120;
    reasons.push("project documentation");
  }
  if (/^(package\.json|pyproject\.toml|cargo\.toml|go\.mod|composer\.json)$/u.test(lower)) {
    score += 110;
    reasons.push("project manifest");
  }
  if (/(^|\/)(app|src|lib|server|client|pages|routes)\//u.test(lower)) {
    score += 45;
    reasons.push("source path");
  }
  if (/(^|\/)(page|route|main|index|app|server)\.[a-z0-9]+$/u.test(lower)) {
    score += 35;
    reasons.push("entrypoint");
  }
  if (/\.(tsx?|jsx?|py|go|rs|java|rb|php|vue|svelte)$/u.test(lower)) {
    score += 20;
    reasons.push("source file");
  }
  if (/\.(test|spec)\./u.test(lower)) {
    score += mode === "review" || mode === "debug" ? 20 : -30;
    reasons.push("test file");
  }

  return { score, reason: reasons.join(", ") || "low relevance" };
}

function limitForDepth(depth: AnalysisDepth): number {
  if (depth === "fast") return 7;
  if (depth === "deep") return 35;
  return 20;
}

function skippedReason(file: RepositoryFile): SkippedReason | null {
  const lower = file.path.toLowerCase();
  if (file.size <= 0) return "empty";
  if (hasSensitivePath(file.path)) return "suspicious_secret";
  if (file.size > MAX_FILE_BYTES) return "too_large";
  if (/(^|\/)(node_modules|vendor|\.git)\//u.test(lower)) return "ignored_directory";
  if (/(^|\/)(dist|build|coverage|generated|\.next|out)\//u.test(lower)) {
    return "generated_or_build";
  }
  return null;
}

export function selectContextFiles(
  files: RepositoryFile[],
  options: ContextSelectionOptions = {},
): ContextSelection {
  const depth = options.depth ?? "balanced";
  const mode = options.mode ?? "build";
  const include = parsePatterns(options.include);
  const exclude = parsePatterns(options.exclude);
  const skipped: SkippedContextFile[] = [];
  const candidates: SelectedContextFile[] = [];

  for (const file of files) {
    const safetyReason = skippedReason(file);
    if (safetyReason) {
      skipped.push({ ...file, reason: safetyReason });
      continue;
    }
    if (include.length && !matchesAny(file.path, include)) {
      skipped.push({ ...file, reason: "not_included_by_user" });
      continue;
    }
    if (exclude.length && matchesAny(file.path, exclude)) {
      skipped.push({ ...file, reason: "excluded_by_user" });
      continue;
    }

    const scored = scorePath(file.path, mode);
    if (scored.score <= 0) {
      skipped.push({
        ...file,
        reason: /\.(test|spec)\./iu.test(file.path) ? "test_file" : "low_relevance",
      });
      continue;
    }
    candidates.push({
      ...file,
      score: scored.score,
      reason: scored.reason,
      estimatedTokens: estimateTokensFromBytes(file.size),
    });
  }

  const selected = candidates
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, options.limit ?? limitForDepth(depth));

  const selectedPaths = new Set(selected.map((file) => file.path));
  for (const file of candidates) {
    if (!selectedPaths.has(file.path)) {
      skipped.push({ path: file.path, size: file.size, reason: "low_relevance" });
    }
  }

  return {
    selected,
    skipped,
    totalTreeEntries: files.length,
    estimatedTokens: selected.reduce((sum, file) => sum + file.estimatedTokens, 0),
    largestFiles: files
      .filter((file) => file.size > 0)
      .sort((a, b) => b.size - a.size || a.path.localeCompare(b.path))
      .slice(0, 5)
      .map((file) => ({
        path: file.path,
        size: file.size,
        estimatedTokens: estimateTokensFromBytes(file.size),
      })),
  };
}

export function chooseContextFiles(
  files: RepositoryFile[],
  limit = 18,
): RepositoryFile[] {
  return selectContextFiles(files, { depth: limit <= 7 ? "fast" : "balanced" })
    .selected.slice(0, limit)
    .map(({ path, size }) => ({ path, size }));
}
