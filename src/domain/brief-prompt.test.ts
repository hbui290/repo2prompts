import assert from "node:assert/strict";
import test from "node:test";

import { buildBriefPrompt } from "./brief-prompt";

test("builds a prompt that separates evidence from inference", () => {
  const prompt = buildBriefPrompt({
    repositoryKey: "acme/tool",
    depth: "fast",
    question: null,
    metadata: { description: "A useful tool", language: "TypeScript", stars: 12 },
    files: [{ path: "README.md", content: "# Tool\nDoes useful work." }],
    treeEntries: 40,
  });

  assert.match(prompt, /Observed evidence/u);
  assert.match(prompt, /Inference/u);
  assert.match(prompt, /Implementation sequence/u);
  assert.match(prompt, /acme\/tool/u);
});

