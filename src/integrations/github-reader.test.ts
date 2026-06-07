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
          { type: "blob", path: "README.md", size: 100 },
          { type: "blob", path: "package.json", size: 80 },
          { type: "blob", path: "dist/bundle.js", size: 90 },
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
    { owner: "acme", repository: "tool", key: "acme/tool" },
    "fast",
    fetcher,
  );

  assert.equal(result.treeEntries, 3);
  assert.deepEqual(
    result.files.map((file) => file.path),
    ["README.md", "package.json"],
  );
});

