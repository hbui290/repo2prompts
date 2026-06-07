import assert from "node:assert/strict";
import test from "node:test";

import { parseRepositoryId } from "./repository-id";

test("accepts owner/repository", () => {
  assert.deepEqual(parseRepositoryId("Vercel/Next.js"), {
    owner: "Vercel",
    repository: "Next.js",
    key: "vercel/next.js",
    ref: null,
    path: null,
  });
});

test("accepts a GitHub repository URL", () => {
  assert.deepEqual(
    parseRepositoryId("https://github.com/vercel/next.js"),
    {
      owner: "vercel",
      repository: "next.js",
      key: "vercel/next.js",
      ref: null,
      path: null,
    },
  );
});

test("accepts a GitHub repository URL with branch and path", () => {
  assert.deepEqual(
    parseRepositoryId("https://github.com/vercel/next.js/tree/canary/packages/next"),
    {
      owner: "vercel",
      repository: "next.js",
      key: "vercel/next.js",
      ref: "canary",
      path: "packages/next",
    },
  );
});

test("rejects non-GitHub URLs", () => {
  assert.throws(
    () => parseRepositoryId("https://example.com/acme/tool"),
    /public GitHub repository/i,
  );
});
