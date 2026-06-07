import assert from "node:assert/strict";
import test from "node:test";

import { createBriefIdentity } from "./brief-identity";

test("uses a stable empty question hash outside focused analysis", () => {
  assert.deepEqual(createBriefIdentity("acme/tool", "build", "fast", "ignored"), {
    repositoryKey: "acme/tool",
    mode: "build",
    depth: "fast",
    questionHash: "none",
  });
});

test("creates distinct hashes for distinct focused questions", () => {
  const first = createBriefIdentity(
    "acme/tool",
    "review",
    "focused",
    "How does auth work?",
  );
  const second = createBriefIdentity(
    "acme/tool",
    "review",
    "focused",
    "How is data stored?",
  );

  assert.equal(first.mode, "review");
  assert.notEqual(first.questionHash, second.questionHash);
});
