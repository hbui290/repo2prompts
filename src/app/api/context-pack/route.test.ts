import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "./route";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/context-pack", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("context pack API returns safe evidence metadata without model generation", async () => {
  const originalFetch = globalThis.fetch;
  const responses = new Map<string, unknown>([
    [
      "https://api.github.com/repos/acme/tool",
      {
        default_branch: "main",
        description: "A useful tool",
        language: "TypeScript",
        stargazers_count: 12,
      },
    ],
    [
      "https://api.github.com/repos/acme/tool/git/trees/main?recursive=1",
      {
        tree: [
          { type: "blob", path: "README.md", size: 120, sha: "readme-sha" },
          { type: "blob", path: "src/app.ts", size: 220, sha: "app-sha" },
          { type: "blob", path: "dist/bundle.js", size: 500, sha: "dist-sha" },
        ],
      },
    ],
    [
      "https://api.github.com/repos/acme/tool/contents/README.md?ref=main",
      { content: Buffer.from("# Tool").toString("base64") },
    ],
    [
      "https://api.github.com/repos/acme/tool/contents/src/app.ts?ref=main",
      { content: Buffer.from("export function run() { return true; }").toString("base64") },
    ],
  ]);

  globalThis.fetch = (async (input) => {
    const value = responses.get(String(input));
    return new Response(JSON.stringify(value), {
      status: value ? 200 : 404,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const response = await POST(jsonRequest({
      repository: "acme/tool",
      mode: "build",
      depth: "fast",
    }));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.contextPack.repository, "acme/tool");
    assert.equal(body.contextPack.mode, "build");
    assert.equal(body.contextPack.depth, "fast");
    assert.equal(body.contextPack.metadata.language, "TypeScript");
    assert.equal(body.contextPack.selectedFiles.length, 2);
    assert.equal(body.contextPack.stats.filesRead, 2);
    assert.equal(typeof body.contextPack.evidenceFingerprint, "string");
    assert.doesNotMatch(JSON.stringify(body), /export function run/u);
    assert.doesNotMatch(JSON.stringify(body), /"content"/u);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("context pack API requires a question for focused scans", async () => {
  const response = await POST(jsonRequest({
    repository: "acme/tool",
    mode: "build",
    depth: "focused",
  }));
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "QUESTION_REQUIRED");
});
