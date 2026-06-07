import assert from "node:assert/strict";
import test from "node:test";

import { extractCompletionText } from "./chat-completion";

test("extracts a standard chat completion", () => {
  const text = extractCompletionText(
    JSON.stringify({
      choices: [{ message: { content: "Build the product." } }],
    }),
  );

  assert.equal(text, "Build the product.");
});

test("combines SSE delta chunks", () => {
  const text = extractCompletionText(
    [
      'data: {"choices":[{"delta":{"content":"Build "}}]}',
      "",
      'data: {"choices":[{"delta":{"content":"the product."}}]}',
      "",
      "data: [DONE]",
    ].join("\n"),
  );

  assert.equal(text, "Build the product.");
});

test("rejects a completion without text", () => {
  assert.throws(() => extractCompletionText('{"choices":[]}'), /text/i);
});

