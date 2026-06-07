import assert from "node:assert/strict";
import test from "node:test";

import { createEvidenceFingerprint } from "./evidence-fingerprint";

test("fingerprint is stable by path order and changes with blob sha", () => {
  const base = {
    repositoryKey: "acme/tool",
    resolvedRef: "main",
    repositoryPath: "",
    include: "",
    exclude: "",
    files: [
      { path: "b.ts", sha: "2" },
      { path: "a.ts", sha: "1" },
    ],
  };
  const first = createEvidenceFingerprint(base);
  const second = createEvidenceFingerprint({ ...base, files: [...base.files].reverse() });
  const changed = createEvidenceFingerprint({
    ...base,
    files: [{ path: "a.ts", sha: "changed" }, base.files[0]],
  });
  assert.equal(first, second);
  assert.notEqual(first, changed);
});
