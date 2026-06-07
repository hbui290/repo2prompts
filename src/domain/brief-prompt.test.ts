import assert from "node:assert/strict";
import test from "node:test";

import { buildBriefPrompt, normalizeAnalysisDepth } from "./brief-prompt";

test("builds a prompt that separates evidence from inference", () => {
  const prompt = buildBriefPrompt({
    repositoryKey: "acme/tool",
    mode: "build",
    depth: "fast",
    question: null,
    metadata: { description: "A useful tool", language: "TypeScript", stars: 12 },
    files: [{ path: "README.md", content: "# Tool\nDoes useful work." }],
    treeEntries: 40,
  });

  assert.match(prompt, /Observed evidence/u);
  assert.match(prompt, /Inference/u);
  assert.match(prompt, /Cite important architecture/u);
  assert.match(prompt, /Implementation sequence/u);
  assert.match(prompt, /acme\/tool/u);
});

test("uses mode-specific heading contracts", () => {
  const prompt = buildBriefPrompt({
    repositoryKey: "acme/tool",
    mode: "review",
    depth: "balanced",
    question: null,
    metadata: { description: null, language: null, stars: 0 },
    files: [{ path: "src/app.ts", content: "export const app = true;" }],
    treeEntries: 1,
  });

  assert.match(prompt, /# High-risk areas/u);
  assert.match(prompt, /# Missing tests/u);
  assert.doesNotMatch(prompt, /# Implementation sequence/u);
});

test("normalizes fast depth without changing it", () => {
  assert.equal(normalizeAnalysisDepth("fast"), "fast");
  assert.equal(normalizeAnalysisDepth("thorough"), "balanced");
  assert.equal(normalizeAnalysisDepth(undefined), "balanced");
});
