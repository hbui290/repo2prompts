import assert from "node:assert/strict";
import test from "node:test";

import {
  fallbackRepositoryMap,
  mergeRepositoryMaps,
  validateRepositoryMap,
} from "./repository-map";

test("removes fabricated citations and downgrades unsupported claims", () => {
  const map = validateRepositoryMap(
    {
      purpose: [{ claim: "Runs an API", files: ["missing.ts"], confidence: "observed" }],
      entrypoints: [],
      modules: [],
      dataFlows: [],
      integrations: [],
      risks: [],
      unknowns: [],
    },
    new Set(["src/app.ts"]),
  );
  assert.deepEqual(map.purpose[0], {
    claim: "Runs an API",
    files: [],
    confidence: "inferred",
  });
});

test("merges duplicate claims and unions citations", () => {
  const first = fallbackRepositoryMap([{ path: "README.md", role: "documentation" }]);
  const second = fallbackRepositoryMap([{ path: "README.md", role: "documentation" }]);
  const merged = mergeRepositoryMaps([first, second], new Set(["README.md"]));
  assert.equal(merged.purpose.length, 1);
  assert.deepEqual(merged.purpose[0]?.files, ["README.md"]);
});
