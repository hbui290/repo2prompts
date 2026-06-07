export type RepositoryId = {
  owner: string;
  repository: string;
  key: string;
};

const PART = /^[A-Za-z0-9_.-]+$/u;

export function parseRepositoryId(input: string): RepositoryId {
  const value = input.trim();
  let parts: string[];

  if (/^https?:\/\//iu.test(value)) {
    const url = new URL(value);
    if (url.hostname.toLowerCase() !== "github.com") {
      throw new Error("Enter a public GitHub repository.");
    }
    parts = url.pathname.split("/").filter(Boolean);
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
  };
}

