import assert from "node:assert/strict";
import test from "node:test";

import {
  buildContextPack,
  buildContextPackExport,
  type ContextPackInput,
} from "./context-pack";

const input: ContextPackInput = {
  repository: "acme/tool",
  mode: "build",
  depth: "balanced",
  question: null,
  include: "src/**",
  exclude: "dist/**",
  evidence: {
    metadata: {
      description: "A useful tool",
      language: "TypeScript",
      stars: 12,
    },
    files: [
      {
        path: "src/app.ts",
        sha: "app-sha",
        content: "OPENAI_API_KEY=sk-secret-that-must-not-export",
      },
    ],
    treeEntries: 42,
    selection: {
      totalTreeEntries: 40,
      estimatedTokens: 120,
      selected: [
        {
          path: "src/app.ts",
          size: 480,
          score: 160,
          reason: "source entrypoint",
          estimatedTokens: 120,
        },
      ],
      skipped: [
        {
          path: "dist/bundle.js",
          size: 3200,
          reason: "generated_or_build",
        },
      ],
      largestFiles: [
        {
          path: "src/large.ts",
          size: 16_000,
          estimatedTokens: 4000,
        },
      ],
    },
    resolvedRef: "main",
    repositoryPath: "",
    evidenceFingerprint: "fingerprint",
  },
};

test("builds a safe context pack from repository evidence", () => {
  const pack = buildContextPack(input);

  assert.equal(pack.repository, "acme/tool");
  assert.equal(pack.resolvedRef, "main");
  assert.equal(pack.evidenceFingerprint, "fingerprint");
  assert.equal(pack.metadata.language, "TypeScript");
  assert.equal(pack.stats.selectedFiles, 1);
  assert.equal(pack.stats.skippedFiles, 1);
  assert.equal(pack.stats.estimatedTokens, 120);
  assert.deepEqual(pack.selectedFiles, [
    {
      path: "src/app.ts",
      size: 480,
      reason: "source entrypoint",
      estimatedTokens: 120,
      score: 160,
    },
  ]);
  assert.deepEqual(pack.skippedFiles, [
    {
      path: "dist/bundle.js",
      size: 3200,
      reason: "generated_or_build",
    },
  ]);
});

test("exports context pack without raw source content", () => {
  const pack = buildContextPack(input);
  const markdown = buildContextPackExport(pack, "markdown");
  const json = buildContextPackExport(pack, "json");

  assert.match(markdown, /Repo2Prompts Context Pack/u);
  assert.match(markdown, /acme\/tool/u);
  assert.match(markdown, /src\/app\.ts/u);
  assert.match(markdown, /generated_or_build/u);
  assert.match(json, /"repository": "acme\/tool"/u);
  assert.match(json, /"evidenceFingerprint": "fingerprint"/u);
  assert.doesNotMatch(markdown, /sk-secret-that-must-not-export/u);
  assert.doesNotMatch(json, /sk-secret-that-must-not-export/u);
  assert.doesNotMatch(json, /OPENAI_API_KEY/u);
  assert.doesNotMatch(json, /"content"/u);
});
