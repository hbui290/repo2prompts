import type { FileRole } from "./file-analysis";
import type { EvidenceGraph } from "./relationship-graph";

export type RepositoryModule = {
  id: string;
  name: string;
  files: string[];
  roles: FileRole[];
  estimatedTokens: number;
};

export function groupRepositoryModules(
  files: Array<{ path: string; role: FileRole; estimatedTokens: number }>,
  graph: EvidenceGraph,
): RepositoryModule[] {
  const groups = new Map<string, typeof files>();
  for (const file of files) {
    const connected = graph.edges.find((edge) => edge.from === file.path || edge.to === file.path);
    const key = connected
      ? [connected.from, connected.to].map((path) => path.split("/").slice(0, 2).join("/")).sort()[0]
      : file.path.split("/").slice(0, 2).join("/") || file.role;
    groups.set(key, [...(groups.get(key) ?? []), file]);
  }
  return [...groups.entries()]
    .map(([name, grouped], index) => {
      const kept = [...grouped]
        .sort((a, b) => a.path.localeCompare(b.path))
        .slice(0, 8);
      return {
        id: `module-${index + 1}`,
        name,
        files: kept.map((file) => file.path),
        roles: [...new Set(kept.map((file) => file.role))],
        estimatedTokens: kept.reduce((sum, file) => sum + file.estimatedTokens, 0),
      };
    })
    .sort((a, b) => b.files.length - a.files.length || a.name.localeCompare(b.name))
    .slice(0, 6);
}
