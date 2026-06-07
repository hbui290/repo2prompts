import assert from "node:assert/strict";
import test from "node:test";

import { createBriefIdentity } from "./brief-identity";

test("uses a stable empty question hash outside focused analysis", () => {
  assert.deepEqual(createBriefIdentity("acme/tool", "fast", "ignored"), {
    repositoryKey: "acme/tool",
    depth: "fast",
    questionHash: "none",
  });
});

test("creates distinct hashes for distinct focused questions", () => {
  const first = createBriefIdentity("acme/tool", "focused", "How does auth work?");
  const second = createBriefIdentity("acme/tool", "focused", "How is data stored?");

  assert.notEqual(first.questionHash, second.questionHash);
});

