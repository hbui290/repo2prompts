type CompletionChoice = {
  message?: { content?: unknown };
  delta?: { content?: unknown };
};

type CompletionPayload = {
  choices?: CompletionChoice[];
};

function contentFrom(payload: CompletionPayload): string {
  return (payload.choices ?? [])
    .map((choice) => choice.message?.content ?? choice.delta?.content ?? "")
    .filter((content): content is string => typeof content === "string")
    .join("");
}

export function extractCompletionText(body: string): string {
  const trimmed = body.trim();
  let text = "";

  if (trimmed.startsWith("data:")) {
    for (const line of trimmed.split(/\r?\n/u)) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      text += contentFrom(JSON.parse(data) as CompletionPayload);
    }
  } else {
    text = contentFrom(JSON.parse(trimmed) as CompletionPayload);
  }

  if (!text.trim()) {
    throw new Error("Chat completion returned no text.");
  }

  return text.trim();
}

