import { extractCompletionText } from "./chat-completion";

export type ModelTask =
  | "repository_analysis"
  | "module_analysis"
  | "brief_writing"
  | "brief_repair";

function endpoint(): string {
  const base = process.env.MODEL_BASE_URL?.trim().replace(/\/+$/u, "");
  if (!base) throw new Error("MODEL_BASE_URL is not configured.");
  return `${base}/chat/completions`;
}

function modelFor(task: ModelTask): string {
  const fallback = process.env.MODEL_CHAT_ID?.trim();
  const configured = task === "repository_analysis" || task === "module_analysis"
    ? process.env.MODEL_ANALYSIS_ID?.trim()
    : process.env.MODEL_WRITER_ID?.trim();
  const model = configured || fallback;
  if (!model) throw new Error("The chat model is not configured.");
  return model;
}

function systemPrompt(task: ModelTask): string {
  if (task === "repository_analysis" || task === "module_analysis") {
    return "Return evidence-grounded JSON only. Cite only supplied repository files and label uncertainty.";
  }
  if (task === "brief_repair") {
    return "Repair the supplied brief without inventing repository evidence. Return Markdown only.";
  }
  return "Produce an evidence-grounded implementation brief. Be specific and explicit about unknowns.";
}

async function complete(
  task: ModelTask,
  prompt: string,
  fetcher: typeof fetch,
): Promise<string> {
  const apiKey = process.env.MODEL_API_KEY?.trim();
  if (!apiKey) throw new Error("The chat model is not configured.");
  const timeout = Number(process.env.MODEL_REQUEST_TIMEOUT_MS ?? 90_000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number.isFinite(timeout) ? timeout : 90_000);
  try {
    const response = await fetcher(endpoint(), {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: modelFor(task),
        stream: false,
        messages: [
          { role: "system", content: systemPrompt(task) },
          { role: "user", content: prompt },
        ],
      }),
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`Chat provider failed with status ${response.status}.`);
    return extractCompletionText(body);
  } finally {
    clearTimeout(timer);
  }
}

export function requestModelText(
  task: ModelTask,
  prompt: string,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  return complete(task, prompt, fetcher);
}

function parseJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/iu)?.[1];
  return JSON.parse((fenced ?? text).trim()) as T;
}

export async function requestModelJson<T>(
  task: ModelTask,
  prompt: string,
  fetcher: typeof fetch = fetch,
): Promise<T> {
  const first = await complete(task, prompt, fetcher);
  try {
    return parseJson<T>(first);
  } catch {
    const repaired = await complete(
      task,
      `${prompt}\n\nYour previous response was malformed. Return one valid JSON object only.`,
      fetcher,
    );
    return parseJson<T>(repaired);
  }
}

export function requestBrief(prompt: string): Promise<string> {
  return requestModelText("brief_writing", prompt);
}
