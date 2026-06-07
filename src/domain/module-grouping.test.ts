import assert from "node:assert/strict";
import test from "node:test";

import { groupRepositoryModules } from "./module-grouping";

test("groups files into bounded modules", () => {
  const files = Array.from({ length: 60 }, (_, index) => ({
    path: `src/feature-${index % 10}/file-${index}.ts`,
    role: "service" as const,
    estimatedTokens: 100,
  }));
  const modules = groupRepositoryModules(files, { nodes: [], edges: [] });
  assert.equal(modules.length <= 6, true);
  assert.equal(modules.every((module) => module.files.length <= 8), true);
});
