import type { BriefIdentity } from "@/domain/brief-identity";
import type { AnalysisDepth, AnalysisMode } from "@/domain/brief-prompt";
import type { RepositoryMap } from "@/domain/repository-map";

export type StoredEvidence = {
  filesRead?: number;
  treeEntries?: number;
  estimatedTokens?: number;
  selectedFiles?: Array<{
    path: string;
    size?: number;
    reason?: string;
    estimatedTokens?: number;
  }>;
  skippedFiles?: Array<{ path: string; reason?: string }>;
  largestFiles?: Array<{ path: string; size?: number; estimatedTokens?: number }>;
  analysis?: {
    pipeline?: "single_pass" | "repository_map" | "module_map";
    repositoryMapSource?: "generated" | "cache" | "not_used";
    modulesAnalyzed?: number;
    evidenceFingerprint?: string;
    quality?: { passed: boolean; warnings: string[]; repaired: boolean };
  };
};

export type StoredBrief = {
  id: string;
  repository_key: string;
  analysis_mode?: AnalysisMode;
  analysis_depth?: AnalysisDepth;
  evidence_fingerprint?: string;
  title: string;
  brief_markdown: string;
  evidence_json: StoredEvidence;
  created_at: string;
  view_count: number;
};

function configuration() {
  const url = process.env.DATABASE_REST_URL?.trim().replace(/\/+$/u, "");
  const key = process.env.DATABASE_SERVICE_KEY?.trim();
  return url && key ? { url, key } : null;
}

async function databaseFetch(path: string, init?: RequestInit): Promise<Response | null> {
  const config = configuration();
  if (!config) return null;

  return fetch(`${config.url}/${path}`, {
    ...init,
    headers: {
      apikey: config.key,
      authorization: `Bearer ${config.key}`,
      "content-type": "application/json",
      ...init?.headers,
    },
  });
}

export async function readStoredBrief(
  identity: BriefIdentity,
  evidenceFingerprint: string,
): Promise<StoredBrief | null> {
  const query = new URLSearchParams({
    repository_key: `eq.${identity.repositoryKey}`,
    analysis_mode: `eq.${identity.mode}`,
    analysis_depth: `eq.${identity.depth}`,
    question_hash: `eq.${identity.questionHash}`,
    evidence_fingerprint: `eq.${evidenceFingerprint}`,
    select:
      "id,repository_key,analysis_mode,analysis_depth,evidence_fingerprint,title,brief_markdown,evidence_json,created_at,view_count",
    limit: "1",
  });
  const response = await databaseFetch(`repository_briefs?${query}`);
  if (!response?.ok) return null;
  const rows = (await response.json()) as StoredBrief[];
  return rows[0] ?? null;
}

export async function saveStoredBrief(input: {
  identity: BriefIdentity;
  title: string;
  brief: string;
  evidence: StoredEvidence;
  evidenceFingerprint: string;
}): Promise<void> {
  await databaseFetch(
    "repository_briefs?on_conflict=repository_key,analysis_mode,analysis_depth,question_hash,evidence_fingerprint",
    {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        repository_key: input.identity.repositoryKey,
        analysis_mode: input.identity.mode,
        analysis_depth: input.identity.depth,
        question_hash: input.identity.questionHash,
        evidence_fingerprint: input.evidenceFingerprint,
        title: input.title,
        brief_markdown: input.brief,
        evidence_json: input.evidence,
        updated_at: new Date().toISOString(),
      }),
    },
  );
}

export async function listStoredBriefs(search: string | null): Promise<StoredBrief[]> {
  const query = new URLSearchParams({
    select:
      "id,repository_key,analysis_mode,analysis_depth,title,brief_markdown,evidence_json,created_at,view_count",
    order: "created_at.desc",
    limit: "30",
  });
  if (search) {
    const safe = search.replace(/[,*()]/gu, " ").trim();
    if (safe) query.set("or", `(repository_key.ilike.*${safe}*,title.ilike.*${safe}*)`);
  }

  const response = await databaseFetch(`repository_briefs?${query}`);
  if (!response?.ok) return [];
  return (await response.json()) as StoredBrief[];
}

export async function readStoredBriefById(id: string): Promise<StoredBrief | null> {
  const query = new URLSearchParams({
    id: `eq.${id}`,
    select:
      "id,repository_key,analysis_mode,analysis_depth,title,brief_markdown,evidence_json,created_at,view_count",
    limit: "1",
  });
  const response = await databaseFetch(`repository_briefs?${query}`);
  if (!response?.ok) return null;
  const rows = (await response.json()) as StoredBrief[];
  return rows[0] ?? null;
}

export type AnalysisCacheIdentity = {
  repositoryKey: string;
  resolvedRef: string;
  repositoryPath: string;
  evidenceFingerprint: string;
  scope: "general" | "focused" | "deep";
  questionHash: string;
};

export async function readStoredAnalysis(
  identity: AnalysisCacheIdentity,
): Promise<RepositoryMap | null> {
  const query = new URLSearchParams({
    repository_key: `eq.${identity.repositoryKey}`,
    resolved_ref: `eq.${identity.resolvedRef}`,
    repository_path: `eq.${identity.repositoryPath}`,
    evidence_fingerprint: `eq.${identity.evidenceFingerprint}`,
    scope: `eq.${identity.scope}`,
    question_hash: `eq.${identity.questionHash}`,
    select: "repository_map",
    limit: "1",
  });
  const response = await databaseFetch(`repository_analysis_cache?${query}`);
  if (!response?.ok) return null;
  const rows = (await response.json()) as Array<{ repository_map: RepositoryMap }>;
  return rows[0]?.repository_map ?? null;
}

export async function saveStoredAnalysis(input: {
  identity: AnalysisCacheIdentity;
  repositoryMap: RepositoryMap;
  evidence?: unknown;
}): Promise<void> {
  await databaseFetch(
    "repository_analysis_cache?on_conflict=repository_key,resolved_ref,repository_path,evidence_fingerprint,scope,question_hash",
    {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        repository_key: input.identity.repositoryKey,
        resolved_ref: input.identity.resolvedRef,
        repository_path: input.identity.repositoryPath,
        evidence_fingerprint: input.identity.evidenceFingerprint,
        scope: input.identity.scope,
        question_hash: input.identity.questionHash,
        repository_map: input.repositoryMap,
        evidence_json: input.evidence ?? {},
        updated_at: new Date().toISOString(),
      }),
    },
  );
}
