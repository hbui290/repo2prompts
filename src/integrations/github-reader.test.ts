import assert from "node:assert/strict";
import test from "node:test";

import { collectRepositoryEvidence } from "./github-reader";

test("collects metadata and selected readable files", async () => {
  const responses = new Map<string, unknown>([
    [
      "https://api.github.com/repos/acme/tool",
      {
        default_branch: "main",
        description: "A useful tool",
        language: "TypeScript",
        stargazers_count: 8,
      },
    ],
    [
      "https://api.github.com/repos/acme/tool/git/trees/main?recursive=1",
      {
        tree: [
          { type: "blob", path: "README.md", size: 100, sha: "readme-sha" },
          { type: "blob", path: "package.json", size: 80, sha: "package-sha" },
          { type: "blob", path: "dist/bundle.js", size: 90, sha: "dist-sha" },
        ],
      },
    ],
    [
      "https://api.github.com/repos/acme/tool/contents/README.md?ref=main",
      { content: Buffer.from("# Tool").toString("base64") },
    ],
    [
      "https://api.github.com/repos/acme/tool/contents/package.json?ref=main",
      { content: Buffer.from('{"name":"tool"}').toString("base64") },
    ],
  ]);

  const fetcher: typeof fetch = async (input) => {
    const value = responses.get(String(input));
    return new Response(JSON.stringify(value), {
      status: value ? 200 : 404,
      headers: { "content-type": "application/json" },
    });
  };

  const result = await collectRepositoryEvidence(
    { owner: "acme", repository: "tool", key: "acme/tool", ref: null, path: null },
    "fast",
    "build",
    {},
    fetcher,
  );

  assert.equal(result.treeEntries, 3);
  assert.equal(result.resolvedRef, "main");
  assert.equal(result.evidenceFingerprint.length, 64);
  assert.equal(result.files[0]?.sha, "readme-sha");
  assert.equal(result.selection.estimatedTokens > 0, true);
  assert.deepEqual(
    result.files.map((file) => file.path),
    ["README.md", "package.json"],
  );
});

test("uses parsed branch and path when collecting evidence", async () => {
  const responses = new Map<string, unknown>([
    [
      "https://api.github.com/repos/acme/tool",
      {
        default_branch: "main",
        description: null,
        language: null,
        stargazers_count: 0,
      },
    ],
    [
      "https://api.github.com/repos/acme/tool/git/trees/dev?recursive=1",
      {
        tree: [
          { type: "blob", path: "packages/api/README.md", size: 100, sha: "api" },
          { type: "blob", path: "packages/web/README.md", size: 100, sha: "web" },
        ],
      },
    ],
    [
      "https://api.github.com/repos/acme/tool/contents/packages/api/README.md?ref=dev",
      { content: Buffer.from("# API").toString("base64") },
    ],
  ]);

  const fetcher: typeof fetch = async (input) => {
    const value = responses.get(String(input));
    return new Response(JSON.stringify(value), {
      status: value ? 200 : 404,
      headers: { "content-type": "application/json" },
    });
  };

  const result = await collectRepositoryEvidence(
    { owner: "acme", repository: "tool", key: "acme/tool", ref: "dev", path: "packages/api" },
    "balanced",
    "build",
    {},
    fetcher,
  );

  assert.deepEqual(
    result.files.map((file) => file.path),
    ["packages/api/README.md"],
  );
});

test("records failed shortlist reads as skipped evidence", async () => {
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/repos/acme/tool")) {
      return Response.json({
        default_branch: "main",
        description: null,
        language: null,
        stargazers_count: 0,
      });
    }
    if (url.includes("/git/trees/")) {
      return Response.json({
        tree: [{ type: "blob", path: "README.md", size: 100, sha: "sha" }],
      });
    }
    return new Response("failed", { status: 500 });
  };

  const result = await collectRepositoryEvidence(
    { owner: "acme", repository: "tool", key: "acme/tool", ref: null, path: null },
    "fast",
    "build",
    {},
    fetcher,
  );

  assert.equal(result.files.length, 0);
  assert.equal(result.selection.skipped[0]?.reason, "read_failed");
});
