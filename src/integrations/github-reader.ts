import type { AnalysisDepth } from "@/domain/brief-prompt";
import type { AnalysisMode } from "@/domain/brief-prompt";
import {
  estimateTokens,
  hasSensitiveContent,
  selectContextFiles,
  type ContextSelection,
} from "@/domain/context-policy";
import {
  finalEvidenceLimit,
  rankEvidenceFiles,
  shortlistLimit,
} from "@/domain/file-analysis";
import { createEvidenceFingerprint } from "@/domain/evidence-fingerprint";
import type { RepositoryId } from "@/domain/repository-id";

type MetadataPayload = {
  default_branch: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
};

type TreePayload = {
  tree: Array<{ type: string; path: string; size?: number; sha?: string }>;
};

type ContentPayload = {
  content?: string;
};

export type RepositoryEvidence = {
  metadata: {
    description: string | null;
    language: string | null;
    stars: number;
  };
  files: Array<{ path: string; content: string; sha: string }>;
  treeEntries: number;
  selection: ContextSelection;
  resolvedRef: string;
  repositoryPath: string;
  evidenceFingerprint: string;
};

function headers(): HeadersInit {
  const token = process.env.GITHUB_API_TOKEN?.trim();
  return {
    accept: "application/vnd.github+json",
    "user-agent": "repo-brief-generator",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

async function githubJson<T>(url: string, fetcher: typeof fetch): Promise<T> {
  const response = await fetcher(url, { headers: headers() });
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "Repository not found."
        : `GitHub request failed with status ${response.status}.`,
    );
  }
  return (await response.json()) as T;
}

function contentUrl(id: RepositoryId, path: string, branch: string): string {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `https://api.github.com/repos/${id.owner}/${id.repository}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;
}

export async function collectRepositoryEvidence(
  id: RepositoryId,
  depth: AnalysisDepth,
  mode: AnalysisMode = "build",
  filters: { include?: string; exclude?: string } = {},
  fetcher: typeof fetch = fetch,
): Promise<RepositoryEvidence> {
  const root = `https://api.github.com/repos/${id.owner}/${id.repository}`;
  const metadata = await githubJson<MetadataPayload>(root, fetcher);
  const ref = id.ref ?? metadata.default_branch;
  const tree = await githubJson<TreePayload>(
    `${root}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    fetcher,
  );

  const rootPath = id.path ? `${id.path.replace(/\/+$/u, "")}/` : null;
  const treeFiles = tree.tree
    .filter((entry) => entry.type === "blob" && typeof entry.size === "number")
    .filter((entry) => !rootPath || entry.path.startsWith(rootPath))
    .map((entry) => ({ path: entry.path, size: entry.size ?? 0, sha: entry.sha ?? "unknown" }));
  const preliminary = selectContextFiles(treeFiles, {
    depth,
    mode,
    include: filters.include,
    exclude: filters.exclude,
    limit: shortlistLimit(depth),
  });
  const contentSkipped = [...preliminary.skipped];

  const readFiles: Array<{ path: string; content: string; sha: string; size: number }> = [];
  for (let offset = 0; offset < preliminary.selected.length; offset += 8) {
    const batch = await Promise.all(
      preliminary.selected.slice(offset, offset + 8).map(async ({ path, size }) => {
        try {
          const payload = await githubJson<ContentPayload>(
            contentUrl(id, path, ref),
            fetcher,
          );
          if (!payload.content) return null;
          const content = Buffer.from(payload.content, "base64")
            .toString("utf8")
            .slice(0, 40_000);
          if (hasSensitiveContent(content)) {
            contentSkipped.push({ path, size: content.length, reason: "suspicious_secret" });
            return null;
          }
          return {
            path,
            content,
            size,
            sha: treeFiles.find((file) => file.path === path)?.sha ?? "unknown",
          };
        } catch {
          contentSkipped.push({ path, size, reason: "read_failed" });
          return null;
        }
      }),
    );
    readFiles.push(
      ...batch.filter(
        (file): file is { path: string; content: string; sha: string; size: number } =>
          file !== null,
      ),
    );
  }

  const ranked = rankEvidenceFiles(readFiles, {
    mode,
    depth,
    question: undefined,
  });
  const kept = ranked.slice(0, finalEvidenceLimit(depth));
  const keptPaths = new Set(kept.map((file) => file.path));
  const files = kept.map(({ path, content = "", sha }) => ({ path, content, sha }));
  for (const file of readFiles) {
    if (!keptPaths.has(file.path)) {
      contentSkipped.push({ path: file.path, size: file.size, reason: "low_relevance" });
    }
  }
  const selected = kept.map((file) => ({
    path: file.path,
    size: file.size,
    score: file.score,
    reason: file.reason,
    estimatedTokens: estimateTokens(file.content ?? ""),
  }));
  const repositoryPath = id.path ?? "";
  const evidenceFingerprint = createEvidenceFingerprint({
    repositoryKey: id.key,
    resolvedRef: ref,
    repositoryPath,
    include: filters.include,
    exclude: filters.exclude,
    files: kept.map(({ path, sha }) => ({ path, sha })),
  });

  return {
    metadata: {
      description: metadata.description,
      language: metadata.language,
      stars: metadata.stargazers_count,
    },
    files,
    treeEntries: tree.tree.length,
    selection: {
      ...preliminary,
      selected,
      skipped: contentSkipped,
      estimatedTokens: files.reduce((sum, file) => sum + estimateTokens(file.content), 0),
    },
    resolvedRef: ref,
    repositoryPath,
    evidenceFingerprint,
  };
}
