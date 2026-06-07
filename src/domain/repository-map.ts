import type { FileRole } from "./file-analysis";

export type EvidenceClaim = {
  claim: string;
  files: string[];
  confidence: "observed" | "inferred";
};

export type RepositoryMapModule = {
  name: string;
  responsibility: string;
  files: string[];
  claims: EvidenceClaim[];
};

export type RepositoryMap = {
  purpose: EvidenceClaim[];
  entrypoints: EvidenceClaim[];
  modules: RepositoryMapModule[];
  dataFlows: EvidenceClaim[];
  integrations: EvidenceClaim[];
  risks: EvidenceClaim[];
  unknowns: string[];
};

const CLAIM_KEYS = ["purpose", "entrypoints", "dataFlows", "integrations", "risks"] as const;

function claim(input: unknown, selected: Set<string>): EvidenceClaim | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Partial<EvidenceClaim>;
  if (typeof value.claim !== "string" || !value.claim.trim()) return null;
  const files = Array.isArray(value.files)
    ? [...new Set(value.files.filter((file): file is string => typeof file === "string" && selected.has(file)))]
    : [];
  return {
    claim: value.claim.trim(),
    files,
    confidence: value.confidence === "observed" && files.length ? "observed" : "inferred",
  };
}

export function validateRepositoryMap(input: unknown, selected: Set<string>): RepositoryMap {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const result: RepositoryMap = {
    purpose: [],
    entrypoints: [],
    modules: [],
    dataFlows: [],
    integrations: [],
    risks: [],
    unknowns: Array.isArray(value.unknowns)
      ? value.unknowns.filter((item): item is string => typeof item === "string")
      : [],
  };
  for (const key of CLAIM_KEYS) {
    result[key] = Array.isArray(value[key])
      ? value[key].map((item) => claim(item, selected)).filter((item): item is EvidenceClaim => Boolean(item))
      : [];
  }
  if (Array.isArray(value.modules)) {
    result.modules = value.modules.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const candidate = item as Partial<RepositoryMapModule>;
      if (typeof candidate.name !== "string") return [];
      const files = Array.isArray(candidate.files)
        ? candidate.files.filter((file): file is string => typeof file === "string" && selected.has(file))
        : [];
      return [{
        name: candidate.name,
        responsibility: typeof candidate.responsibility === "string" ? candidate.responsibility : "",
        files,
        claims: Array.isArray(candidate.claims)
          ? candidate.claims.map((item) => claim(item, selected)).filter((item): item is EvidenceClaim => Boolean(item))
          : [],
      }];
    });
  }
  return result;
}

export function fallbackRepositoryMap(files: Array<{ path: string; role: FileRole }>): RepositoryMap {
  const docs = files.filter((file) => file.role === "documentation");
  const entries = files.filter((file) => file.role === "entrypoint" || file.role === "route");
  return {
    purpose: docs.length ? [{ claim: "Project purpose is documented in repository documentation.", files: docs.map((file) => file.path), confidence: "observed" }] : [],
    entrypoints: entries.map((file) => ({ claim: `Entrypoint evidence: ${file.path}`, files: [file.path], confidence: "observed" })),
    modules: [],
    dataFlows: [],
    integrations: [],
    risks: [],
    unknowns: ["Model-generated repository map was unavailable; deterministic evidence summary was used."],
  };
}

function mergeClaims(groups: EvidenceClaim[][]): EvidenceClaim[] {
  const merged = new Map<string, EvidenceClaim>();
  for (const item of groups.flat()) {
    const key = item.claim.trim().toLowerCase().replace(/\s+/gu, " ");
    const existing = merged.get(key);
    merged.set(key, existing ? {
      claim: existing.claim,
      files: [...new Set([...existing.files, ...item.files])].sort(),
      confidence: existing.confidence === "observed" || item.confidence === "observed" ? "observed" : "inferred",
    } : item);
  }
  return [...merged.values()];
}

export function mergeRepositoryMaps(maps: RepositoryMap[], selected: Set<string>): RepositoryMap {
  const validated = maps.map((map) => validateRepositoryMap(map, selected));
  return {
    purpose: mergeClaims(validated.map((map) => map.purpose)),
    entrypoints: mergeClaims(validated.map((map) => map.entrypoints)),
    modules: validated.flatMap((map) => map.modules),
    dataFlows: mergeClaims(validated.map((map) => map.dataFlows)),
    integrations: mergeClaims(validated.map((map) => map.integrations)),
    risks: mergeClaims(validated.map((map) => map.risks)),
    unknowns: [...new Set(validated.flatMap((map) => map.unknowns))],
  };
}
