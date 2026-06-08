import assert from "node:assert/strict";
import test from "node:test";

import { buildBriefExport } from "./brief-export";

const input = {
  repository: "owner/repo",
  mode: "review",
  depth: "deep",
  brief: "# Review\n\nUse [src/app.ts].",
  evidence: {
    selectedFiles: [{ path: "src/app.ts", estimatedTokens: 120 }],
    skippedFiles: [{ path: ".env", reason: "sensitive path" }],
    readiness: {
      score: 82,
      label: "Strong",
      confidence: "high",
      improvements: ["Add AGENTS.md with coding-agent instructions."],
      bestNextPrompt: "Inspect owner/repo and add AGENTS.md. Do not refactor unrelated files.",
      verificationCommands: ["pnpm test", "pnpm lint"],
      safety: {
        level: "low",
        warnings: [],
        disclaimer: "This report is based on selected repository evidence.",
      },
    },
    analysis: {
      quality: { passed: false, warnings: ["Missing citation"], repaired: true },
    },
  },
};

test("builds Codex export with core metadata and evidence paths", () => {
  const output = buildBriefExport(input, "codex");

  assert.match(output, /Repo2Prompts Codex Handoff/u);
  assert.match(output, /Repository: owner\/repo/u);
  assert.match(output, /Mode: review/u);
  assert.match(output, /Depth: deep/u);
  assert.match(output, /src\/app\.ts/u);
  assert.match(output, /Missing citation/u);
  assert.match(output, /Agent Readiness: 82\/100 - Strong/u);
  assert.match(output, /Add AGENTS\.md/u);
  assert.match(output, /pnpm test/u);
  assert.match(output, /# Review/u);
});

test("builds different agent labels for Cursor and Claude", () => {
  assert.match(buildBriefExport(input, "cursor"), /Repo2Prompts Cursor Brief/u);
  assert.match(buildBriefExport(input, "claude"), /Repo2Prompts Claude Brief/u);
});

test("exports evidence json without including source content or secret-like fields", () => {
  const output = buildBriefExport(
    {
      ...input,
      evidence: {
        ...input.evidence,
        selectedFiles: [
          { path: "src/app.ts", content: "OPENAI_API_KEY=sk-secret" },
        ],
      },
    },
    "evidence-json",
  );

  assert.match(output, /src\/app\.ts/u);
  assert.match(output, /"readiness"/u);
  assert.match(output, /"score": 82/u);
  assert.doesNotMatch(output, /sk-secret/u);
  assert.doesNotMatch(output, /OPENAI_API_KEY/u);
});
