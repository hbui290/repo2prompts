import type { FileRole } from "./file-analysis";

export type EvidenceGraph = {
  nodes: Array<{ path: string; role: FileRole }>;
  edges: Array<{
    from: string;
    to: string;
    kind: "import" | "route" | "database" | "environment" | "path";
  }>;
};

type GraphFile = { path: string; role: FileRole; content: string };

function resolveRelative(from: string, target: string, paths: Set<string>): string | null {
  const base = from.split("/").slice(0, -1);
  for (const part of target.split("/")) {
    if (part === ".") continue;
    if (part === "..") base.pop();
    else base.push(part);
  }
  const raw = base.join("/");
  return [...paths].find((path) => path === raw || path.replace(/\.[^.]+$/u, "") === raw) ?? null;
}

export function buildRelationshipGraph(files: GraphFile[]): EvidenceGraph {
  const paths = new Set(files.map((file) => file.path));
  const edges: EvidenceGraph["edges"] = [];
  const signalOwners = new Map<string, string>();

  for (const file of files) {
    const imports = file.content.matchAll(/(?:from\s+|require\(|import\()\s*["']([^"']+)["']/gu);
    for (const match of imports) {
      if (!match[1]?.startsWith(".")) continue;
      const target = resolveRelative(file.path, match[1], paths);
      if (target) edges.push({ from: file.path, to: target, kind: "import" });
    }
    for (const match of file.content.matchAll(/process\.env\.([A-Z0-9_]+)/gu)) {
      const signal = `env:${match[1]}`;
      const owner = signalOwners.get(signal);
      if (owner && owner !== file.path) edges.push({ from: file.path, to: owner, kind: "environment" });
      else signalOwners.set(signal, file.path);
    }
    for (const match of file.content.matchAll(/\b(?:from|into|update|table)\s+["'`]?([a-zA-Z0-9_.-]+)/giu)) {
      const signal = `db:${match[1]}`;
      const owner = signalOwners.get(signal);
      if (owner && owner !== file.path) edges.push({ from: file.path, to: owner, kind: "database" });
      else signalOwners.set(signal, file.path);
    }
  }
  return { nodes: files.map(({ path, role }) => ({ path, role })), edges };
}
