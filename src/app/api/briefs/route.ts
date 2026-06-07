import { buildBriefPrompt, type AnalysisDepth } from "@/domain/brief-prompt";
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
  depth?: unknown;
  question?: unknown;
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

  const depth: AnalysisDepth =
    body.depth === "thorough" || body.depth === "focused" ? body.depth : "fast";
  const question =
    typeof body.question === "string" && body.question.trim()
      ? body.question.trim()
      : null;

  if (depth === "focused" && !question) {
    return errorResponse(
      "QUESTION_REQUIRED",
      "Focused analysis requires a question.",
      400,
    );
  }

  try {
    const id = parseRepositoryId(body.repository);
    const identity = createBriefIdentity(id.key, depth, question);
    const stored = await readStoredBrief(identity);
    if (stored) {
      return Response.json({
        brief: stored.brief_markdown,
        source: "cache",
        evidence: {
          filesRead: stored.evidence_json.filesRead ?? 0,
          treeEntries: stored.evidence_json.treeEntries ?? 0,
        },
      });
    }

    const evidence = await collectRepositoryEvidence(id, depth);
    const brief = await requestBrief(
      buildBriefPrompt({
        repositoryKey: id.key,
        depth,
        question,
        ...evidence,
      }),
    );
    const responseEvidence = {
      filesRead: evidence.files.length,
      treeEntries: evidence.treeEntries,
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
    if (/chat|model|MODEL_/iu.test(message)) {
      return errorResponse("MODEL_UNAVAILABLE", message, 502);
    }
    return errorResponse("INTERNAL_ERROR", "Unable to generate the brief.", 500);
  }
}
