import type { AnalysisDepth } from "@/domain/brief-prompt";
import type { AnalysisMode } from "@/domain/brief-prompt";
import {
  estimateTokens,
  hasSensitiveContent,
  selectContextFiles,
  type ContextSelection,
} from "@/domain/context-policy";
import type { RepositoryId } from "@/domain/repository-id";

type MetadataPayload = {
  default_branch: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
};

type TreePayload = {
  tree: Array<{ type: string; path: string; size?: number }>;
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
  files: Array<{ path: string; content: string }>;
  treeEntries: number;
  selection: ContextSelection;
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
    .map((entry) => ({ path: entry.path, size: entry.size ?? 0 }));
  const selection = selectContextFiles(treeFiles, {
    depth,
    mode,
    include: filters.include,
    exclude: filters.exclude,
  });
  const contentSkipped = [...selection.skipped];

  const files = (
    await Promise.all(
      selection.selected.map(async ({ path }) => {
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
          };
        } catch {
          return null;
        }
      }),
    )
  ).filter((file): file is { path: string; content: string } => file !== null);

  return {
    metadata: {
      description: metadata.description,
      language: metadata.language,
      stars: metadata.stargazers_count,
    },
    files,
    treeEntries: tree.tree.length,
    selection: {
      ...selection,
      selected: selection.selected
        .filter((file) => files.some((readable) => readable.path === file.path))
        .map((file) => {
          const readable = files.find((item) => item.path === file.path);
          return readable
            ? { ...file, estimatedTokens: estimateTokens(readable.content) }
            : file;
        }),
      skipped: contentSkipped,
      estimatedTokens: files.reduce((sum, file) => sum + estimateTokens(file.content), 0),
    },
  };
}
