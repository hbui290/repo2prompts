import { normalizeAnalysisDepth, normalizeAnalysisMode } from "@/domain/brief-prompt";
import { buildContextPack } from "@/domain/context-pack";
import { parseRepositoryId } from "@/domain/repository-id";
import { collectRepositoryEvidence } from "@/integrations/github-reader";
import {
  checkConfiguredRateLimit,
  createRateLimiter,
} from "@/integrations/rate-limit";
import { logServerEvent } from "@/integrations/server-log";

export const runtime = "nodejs";

const postLimiter = createRateLimiter();

type ContextPackRequest = {
  repository?: unknown;
  mode?: unknown;
  depth?: unknown;
  question?: unknown;
  include?: unknown;
  exclude?: unknown;
};

function errorResponse(code: string, message: string, status: number, requestId: string) {
  return Response.json({ error: { code, message, requestId } }, { status });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  const route = "/api/context-pack";
  const rateLimit = await checkConfiguredRateLimit(postLimiter, request, route);
  if (rateLimit.storageFailed) {
    logServerEvent("warn", {
      route,
      requestId,
      event: "rate_limit_storage_failed",
      code: "RATE_LIMIT_STORAGE_FAILED",
    });
  }
  if (rateLimit.limited) {
    logServerEvent("warn", {
      route,
      requestId,
      event: "rate_limited",
      code: "RATE_LIMITED",
      durationMs: Date.now() - startedAt,
    });
    return errorResponse("RATE_LIMITED", "Too many requests. Try again later.", 429, requestId);
  }

  let body: ContextPackRequest;
  try {
    body = (await request.json()) as ContextPackRequest;
  } catch {
    logServerEvent("warn", {
      route,
      requestId,
      event: "invalid_request",
      code: "INVALID_REQUEST",
      durationMs: Date.now() - startedAt,
    });
    return errorResponse("INVALID_REQUEST", "Send a valid JSON request.", 400, requestId);
  }

  if (typeof body.repository !== "string") {
    logServerEvent("warn", {
      route,
      requestId,
      event: "invalid_repository",
      code: "INVALID_REPOSITORY",
      durationMs: Date.now() - startedAt,
    });
    return errorResponse(
      "INVALID_REPOSITORY",
      "Enter a public GitHub repository as owner/repository or URL.",
      400,
      requestId,
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
    logServerEvent("warn", {
      route,
      requestId,
      event: "question_required",
      code: "QUESTION_REQUIRED",
      repository: body.repository,
      mode,
      depth,
      durationMs: Date.now() - startedAt,
    });
    return errorResponse(
      "QUESTION_REQUIRED",
      "Focused context packs require a question.",
      400,
      requestId,
    );
  }

  try {
    const id = parseRepositoryId(body.repository);
    const evidence = await collectRepositoryEvidence(id, depth, mode, {
      include,
      exclude,
      question,
    });
    if (!evidence.files.length) throw new Error("NO_EVIDENCE: No readable repository evidence was found.");
    const contextPack = buildContextPack({
      repository: id.key,
      mode,
      depth,
      question,
      include,
      exclude,
      evidence,
    });
    logServerEvent("info", {
      route,
      requestId,
      event: "context_pack_built",
      repository: id.key,
      mode,
      depth,
      durationMs: Date.now() - startedAt,
    });
    return Response.json({ contextPack });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed.";
    const baseEvent = {
      route,
      requestId,
      repository: body.repository,
      mode,
      depth,
      durationMs: Date.now() - startedAt,
    };
    if (/public GitHub repository|Repository not found/iu.test(message)) {
      logServerEvent("warn", { ...baseEvent, event: "repository_not_found", code: "REPOSITORY_NOT_FOUND" });
      return errorResponse("REPOSITORY_NOT_FOUND", message, 404, requestId);
    }
    if (/GitHub request/iu.test(message)) {
      logServerEvent("error", { ...baseEvent, event: "github_unavailable", code: "GITHUB_UNAVAILABLE" });
      return errorResponse("GITHUB_UNAVAILABLE", message, 502, requestId);
    }
    if (/Filter patterns/iu.test(message)) {
      logServerEvent("warn", { ...baseEvent, event: "invalid_filter", code: "INVALID_FILTER" });
      return errorResponse("INVALID_FILTER", message, 400, requestId);
    }
    if (/NO_EVIDENCE/iu.test(message)) {
      logServerEvent("warn", { ...baseEvent, event: "no_evidence", code: "NO_EVIDENCE" });
      return errorResponse("NO_EVIDENCE", "No readable repository evidence was found.", 422, requestId);
    }
    logServerEvent("error", { ...baseEvent, event: "internal_error", code: "INTERNAL_ERROR" });
    return errorResponse("INTERNAL_ERROR", "Unable to build the context pack.", 500, requestId);
  }
}
