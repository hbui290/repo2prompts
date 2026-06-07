import assert from "node:assert/strict";
import test from "node:test";

import type { RepositoryEvidence } from "./github-reader";
import { runAnalysisPipeline, type AnalysisPipelineDependencies } from "./analysis-pipeline";

const evidence: RepositoryEvidence = {
  metadata: { description: "Tool", language: "TypeScript", stars: 1 },
  files: [
    { path: "README.md", content: "# Tool", sha: "a" },
    { path: "src/app.ts", content: "export const app = true;", sha: "b" },
  ],
  treeEntries: 2,
  resolvedRef: "main",
  repositoryPath: "",
  evidenceFingerprint: "fingerprint",
  selection: {
    selected: [
      { path: "README.md", size: 10, score: 100, reason: "documentation", estimatedTokens: 2 },
      { path: "src/app.ts", size: 20, score: 90, reason: "entrypoint", estimatedTokens: 5 },
    ],
    skipped: [],
    totalTreeEntries: 2,
    estimatedTokens: 7,
    largestFiles: [],
  },
};

function dependencies(overrides: Partial<AnalysisPipelineDependencies> = {}) {
  const calls: string[] = [];
  const deps: AnalysisPipelineDependencies = {
    collectEvidence: async () => evidence,
    readBrief: async () => null,
    saveBrief: async () => undefined,
    readAnalysis: async () => null,
    saveAnalysis: async () => undefined,
    requestText: async (task) => {
      calls.push(task);
      return [
        "# Product purpose", "# Observed evidence", "# User-visible capabilities",
        "# Architecture and data flow", "# External integrations", "# Implementation sequence",
        "# Verification plan", "# Inferences and unknowns", "[README.md]", "x".repeat(1800),
      ].join("\n\n");
    },
    requestJson: async (task) => {
      calls.push(task);
      return {
        purpose: [{ claim: "Tool", files: ["README.md"], confidence: "observed" }],
        entrypoints: [], modules: [], dataFlows: [], integrations: [], risks: [], unknowns: [],
      };
    },
    ...overrides,
  };
  return { deps, calls };
}

test("fast uses one writer call and no repository map", async () => {
  const { deps, calls } = dependencies();
  const result = await runAnalysisPipeline({
    repository: "acme/tool", mode: "build", depth: "fast", question: null,
  }, deps);
  assert.deepEqual(calls, ["brief_writing"]);
  assert.equal(result.analysis.pipeline, "single_pass");
});

test("balanced creates a repository map before writing", async () => {
  const { deps, calls } = dependencies();
  const result = await runAnalysisPipeline({
    repository: "acme/tool", mode: "build", depth: "balanced", question: null,
  }, deps);
  assert.deepEqual(calls, ["repository_analysis", "brief_writing"]);
  assert.equal(result.analysis.repositoryMapSource, "generated");
});

test("balanced reuses a cached repository map", async () => {
  const cached = {
    purpose: [], entrypoints: [], modules: [], dataFlows: [], integrations: [], risks: [], unknowns: [],
  };
  const { deps, calls } = dependencies({ readAnalysis: async () => cached });
  const result = await runAnalysisPipeline({
    repository: "acme/tool", mode: "build", depth: "balanced", question: null,
  }, deps);
  assert.deepEqual(calls, ["brief_writing"]);
  assert.equal(result.analysis.repositoryMapSource, "cache");
});
