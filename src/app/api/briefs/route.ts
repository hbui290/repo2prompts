import {
  buildBriefPrompt,
  normalizeAnalysisDepth,
  normalizeAnalysisMode,
} from "@/domain/brief-prompt";
import { createBriefIdentity } from "@/domain/brief-identity";
import { parseRepositoryId } from "@/domain/repository-id";
import {
  listStoredBriefs,
  readStoredBrief,
  saveStoredBrief,
} from "@/integrations/brief-store";
import { collectRepositoryEvidence } from "@/integrations/github-reader";
import { requestBrief } from "@/integrations/model-client";
import {
  checkRateLimit,
  createRateLimiter,
  requestKey,
} from "@/integrations/rate-limit";

export const runtime = "nodejs";

const postLimiter = createRateLimiter();

type BriefRequest = {
  repository?: unknown;
  mode?: unknown;
  depth?: unknown;
  question?: unknown;
  include?: unknown;
  exclude?: unknown;
};

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams.get("q");
  const rows = await listStoredBriefs(search);
  return Response.json({
    items: rows.map((row) => ({
      id: row.id,
      repository: row.repository_key,
      title: row.title,
      summary: row.brief_markdown.slice(0, 220),
      mode: row.analysis_mode ?? "build",
      depth: row.analysis_depth ?? "fast",
      createdAt: row.created_at,
      views: row.view_count,
    })),
    nextCursor: null,
    searchMode: search ? "text" : "none",
  });
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(postLimiter, requestKey(request));
  if (rateLimit.limited) {
    return errorResponse("RATE_LIMITED", "Too many requests. Try again later.", 429);
  }

  let body: BriefRequest;
  try {
    body = (await request.json()) as BriefRequest;
  } catch {
    return errorResponse("INVALID_REQUEST", "Send a valid JSON request.", 400);
  }

  if (typeof body.repository !== "string") {
    return errorResponse(
      "INVALID_REPOSITORY",
      "Enter a public GitHub repository as owner/repository or URL.",
      400,
    );
  }

  const mode = normalizeAnalysisMode(body.mode);
  const depth = normalizeAnalysisDepth(body.depth);
  const question =
    typeof body.question === "string" && body.question.trim()
      ? body.question.trim()
      : null;
  const include = typeof body.include === "string" ? body.include : undefined;
  const exclude = typeof body.exclude === "string" ? body.exclude : undefined;

  if (depth === "focused" && !question) {
    return errorResponse(
      "QUESTION_REQUIRED",
      "Focused analysis requires a question.",
      400,
    );
  }

  try {
    const id = parseRepositoryId(body.repository);
    const identity = createBriefIdentity(id.key, mode, depth, question);
    const stored = await readStoredBrief(identity);
    if (stored) {
      return Response.json({
        brief: stored.brief_markdown,
        source: "cache",
        mode: stored.analysis_mode ?? mode,
        depth: stored.analysis_depth ?? depth,
        evidence: {
          filesRead: stored.evidence_json.filesRead ?? 0,
          treeEntries: stored.evidence_json.treeEntries ?? 0,
          estimatedTokens: stored.evidence_json.estimatedTokens ?? 0,
          selectedFiles: stored.evidence_json.selectedFiles ?? [],
          skippedFiles: stored.evidence_json.skippedFiles ?? [],
          largestFiles: stored.evidence_json.largestFiles ?? [],
        },
      });
    }

    const evidence = await collectRepositoryEvidence(id, depth, mode, { include, exclude });
    const brief = await requestBrief(
      buildBriefPrompt({
        repositoryKey: id.key,
        mode,
        depth,
        question,
        ...evidence,
      }),
    );
    const responseEvidence = {
      filesRead: evidence.files.length,
      treeEntries: evidence.treeEntries,
      estimatedTokens: evidence.selection.estimatedTokens,
      selectedFiles: evidence.selection.selected.map((file) => ({
        path: file.path,
        size: file.size,
        reason: file.reason,
        estimatedTokens: file.estimatedTokens,
      })),
      skippedFiles: evidence.selection.skipped.map((file) => ({
        path: file.path,
        reason: file.reason,
      })),
      largestFiles: evidence.selection.largestFiles,
    };
    await saveStoredBrief({
      identity,
      title: id.key,
      brief,
      evidence: responseEvidence,
    });

    return Response.json({
      brief,
      source: "generated",
      mode,
      depth,
      evidence: responseEvidence,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed.";
    if (/public GitHub repository|Repository not found/iu.test(message)) {
      return errorResponse("REPOSITORY_NOT_FOUND", message, 404);
    }
    if (/GitHub request/iu.test(message)) {
      return errorResponse("GITHUB_UNAVAILABLE", message, 502);
    }
    if (/Filter patterns/iu.test(message)) {
      return errorResponse("INVALID_FILTER", message, 400);
    }
    if (/chat|model|MODEL_/iu.test(message)) {
      return errorResponse("MODEL_UNAVAILABLE", message, 502);
    }
    return errorResponse("INTERNAL_ERROR", "Unable to generate the brief.", 500);
  }
}
