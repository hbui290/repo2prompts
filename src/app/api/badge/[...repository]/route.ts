import { computeAgentReadiness, type AgentReadinessReport } from "@/domain/agent-readiness";
import { readLatestStoredBriefByRepository } from "@/integrations/brief-store";

export const runtime = "nodejs";

type BadgeContext = {
  params: Promise<{ repository?: string[] }>;
};

function escapeSvg(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

export function parseBadgeRepository(parts: string[] | undefined): string | null {
  if (!parts || parts.length < 2) return null;
  const [owner, repo] = parts;
  if (!owner?.trim() || !repo?.trim()) return null;
  return `${owner.trim()}/${repo.trim()}`;
}

export function buildBadgeSvg(readiness: Pick<AgentReadinessReport, "score" | "label"> | null): string {
  const label = readiness
    ? `AI Ready ${readiness.score} ${readiness.label}`
    : "AI Ready unknown";
  const safeLabel = escapeSvg(label);
  const labelWidth = Math.max(118, 34 + safeLabel.length * 7);
  const width = 112 + labelWidth;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="28" role="img" aria-label="Repo2Prompts ${safeLabel}">
  <linearGradient id="r2p" x2="1" y2="1">
    <stop offset="0" stop-color="#22d3ee"/>
    <stop offset="1" stop-color="#a855f7"/>
  </linearGradient>
  <rect width="112" height="28" fill="#111827"/>
  <rect x="112" width="${labelWidth}" height="28" fill="url(#r2p)"/>
  <text x="56" y="18" fill="#f9fafb" font-family="Inter,Arial,sans-serif" font-size="12" font-weight="700" text-anchor="middle">Repo2Prompts</text>
  <text x="${112 + labelWidth / 2}" y="18" fill="#020617" font-family="Inter,Arial,sans-serif" font-size="12" font-weight="800" text-anchor="middle">${safeLabel}</text>
</svg>`;
}

function svgResponse(svg: string): Response {
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=300",
    },
  });
}

export async function GET(_request: Request, context: BadgeContext): Promise<Response> {
  const params = await context.params;
  const repository = parseBadgeRepository(params.repository);
  if (!repository) return svgResponse(buildBadgeSvg(null));

  const brief = await readLatestStoredBriefByRepository(repository);
  if (!brief) return svgResponse(buildBadgeSvg(null));

  const readiness = brief.evidence_json.readiness ?? computeAgentReadiness({
    repository: brief.repository_key,
    mode: brief.analysis_mode,
    depth: brief.analysis_depth,
    brief: brief.brief_markdown,
    evidence: brief.evidence_json,
  });

  return svgResponse(buildBadgeSvg(readiness));
}
