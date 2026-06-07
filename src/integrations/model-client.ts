import { extractCompletionText } from "./chat-completion";

function endpoint(): string {
  const base = process.env.MODEL_BASE_URL?.trim().replace(/\/+$/u, "");
  if (!base) throw new Error("MODEL_BASE_URL is not configured.");
  return `${base}/chat/completions`;
}

export async function requestBrief(prompt: string): Promise<string> {
  const apiKey = process.env.MODEL_API_KEY?.trim();
  const model = process.env.MODEL_CHAT_ID?.trim();
  if (!apiKey || !model) {
    throw new Error("The chat model is not configured.");
  }

  const response = await fetch(endpoint(), {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        {
          role: "system",
          content:
            "Produce evidence-grounded implementation briefs. Be specific, concise, and explicit about unknowns.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Chat provider failed with status ${response.status}.`);
  }

  return extractCompletionText(body);
}

