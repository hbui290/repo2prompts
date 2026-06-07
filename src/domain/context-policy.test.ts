import assert from "node:assert/strict";
import test from "node:test";

import { chooseContextFiles } from "./context-policy";

test("prioritizes documentation, manifests, and application entrypoints", () => {
  const chosen = chooseContextFiles(
    [
      { path: "vendor/large.js", size: 1000 },
      { path: "README.md", size: 3000 },
      { path: "package.json", size: 1000 },
      { path: "src/app/page.tsx", size: 5000 },
      { path: "src/app/page.test.tsx", size: 4000 },
    ],
    3,
  );

  assert.deepEqual(
    chosen.map((file) => file.path),
    ["README.md", "package.json", "src/app/page.tsx"],
  );
});

test("excludes generated and oversized files", () => {
  const chosen = chooseContextFiles([
    { path: "dist/bundle.js", size: 3000 },
    { path: "src/generated/client.ts", size: 3000 },
    { path: "src/core.ts", size: 500_000 },
  ]);

  assert.deepEqual(chosen, []);
});

