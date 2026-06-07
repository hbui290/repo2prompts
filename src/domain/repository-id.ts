export type RepositoryId = {
  owner: string;
  repository: string;
  key: string;
  ref: string | null;
  path: string | null;
};

const PART = /^[A-Za-z0-9_.-]+$/u;

export function parseRepositoryId(input: string): RepositoryId {
  const value = input.trim();
  let parts: string[];
  let ref: string | null = null;
  let path: string | null = null;

  if (/^https?:\/\//iu.test(value)) {
    const url = new URL(value);
    if (url.hostname.toLowerCase() !== "github.com") {
      throw new Error("Enter a public GitHub repository.");
    }
    parts = url.pathname.split("/").filter(Boolean);
    const treeIndex = parts.indexOf("tree");
    if (treeIndex === 2) {
      ref = parts[3] ?? null;
      path = parts.slice(4).join("/") || null;
    }
  } else {
    parts = value.split("/").filter(Boolean);
  }

  const [owner, repository] = parts;
  if (!owner || !repository || !PART.test(owner) || !PART.test(repository)) {
    throw new Error("Enter a public GitHub repository.");
  }

  return {
    owner,
    repository: repository.replace(/\.git$/u, ""),
    key: `${owner}/${repository.replace(/\.git$/u, "")}`.toLowerCase(),
    ref,
    path,
  };
}
