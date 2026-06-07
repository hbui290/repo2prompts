import { normalizeAnalysisDepth, normalizeAnalysisMode } from "@/domain/brief-prompt";
import { listStoredBriefs } from "@/integrations/brief-store";
import { runAnalysisPipeline } from "@/integrations/analysis-pipeline";
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
    return Response.json(await runAnalysisPipeline({
      repository: body.repository,
      mode,
      depth,
      question,
      include,
      exclude,
    }));
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
    if (/NO_EVIDENCE/iu.test(message)) {
      return errorResponse("NO_EVIDENCE", "No readable repository evidence was found.", 422);
    }
    if (/chat|model|MODEL_/iu.test(message)) {
      return errorResponse("MODEL_UNAVAILABLE", message, 502);
    }
    return errorResponse("INTERNAL_ERROR", "Unable to generate the brief.", 500);
  }
}
