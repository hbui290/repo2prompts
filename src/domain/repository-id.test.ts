import assert from "node:assert/strict";
import test from "node:test";

import { parseRepositoryId } from "./repository-id";

test("accepts owner/repository", () => {
  assert.deepEqual(parseRepositoryId("Vercel/Next.js"), {
    owner: "Vercel",
    repository: "Next.js",
    key: "vercel/next.js",
  });
});

test("accepts a GitHub repository URL and ignores trailing path", () => {
  assert.deepEqual(
    parseRepositoryId("https://github.com/vercel/next.js/tree/canary"),
    {
      owner: "vercel",
      repository: "next.js",
      key: "vercel/next.js",
    },
  );
});

test("rejects non-GitHub URLs", () => {
  assert.throws(
    () => parseRepositoryId("https://example.com/acme/tool"),
    /public GitHub repository/i,
  );
});

