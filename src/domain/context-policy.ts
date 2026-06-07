export type RepositoryFile = {
  path: string;
  size: number;
};

const MAX_FILE_BYTES = 120_000;

function scorePath(path: string): number {
  const lower = path.toLowerCase();
  let score = 0;

  if (/^(readme|contributing|architecture)(\.|$)/u.test(lower)) score += 120;
  if (/^(package\.json|pyproject\.toml|cargo\.toml|go\.mod|composer\.json)$/u.test(lower)) score += 110;
  if (/(^|\/)(app|src|lib|server|client)\//u.test(lower)) score += 45;
  if (/(^|\/)(page|route|main|index|app)\.[a-z0-9]+$/u.test(lower)) score += 35;
  if (/\.(tsx?|jsx?|py|go|rs|java|rb|php|vue|svelte)$/u.test(lower)) score += 20;
  if (/\.(test|spec)\./u.test(lower)) score -= 30;

  return score;
}

export function chooseContextFiles(
  files: RepositoryFile[],
  limit = 18,
): RepositoryFile[] {
  return files
    .filter(({ path, size }) => {
      const lower = path.toLowerCase();
      return (
        size > 0 &&
        size <= MAX_FILE_BYTES &&
        !/(^|\/)(node_modules|vendor|dist|build|coverage|generated)\//u.test(lower)
      );
    })
    .map((file) => ({ file, score: scorePath(file.path) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.file.path.localeCompare(b.file.path))
    .slice(0, limit)
    .map(({ file }) => file);
}
