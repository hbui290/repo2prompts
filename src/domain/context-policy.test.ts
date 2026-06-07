import assert from "node:assert/strict";
import test from "node:test";

import {
  chooseContextFiles,
  hasSensitiveContent,
  hasSensitivePath,
  selectContextFiles,
} from "./context-policy";

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

test("records skipped reasons for generated and oversized files", () => {
  const result = selectContextFiles([
    { path: "dist/bundle.js", size: 3000 },
    { path: "src/generated/client.ts", size: 3000 },
    { path: "src/core.ts", size: 500_000 },
  ]);

  assert.deepEqual(result.selected, []);
  assert.deepEqual(
    result.skipped.map((file) => [file.path, file.reason]),
    [
      ["dist/bundle.js", "generated_or_build"],
      ["src/generated/client.ts", "generated_or_build"],
      ["src/core.ts", "too_large"],
    ],
  );
});

test("applies include and exclude filters after safety checks", () => {
  const result = selectContextFiles(
    [
      { path: "README.md", size: 1000 },
      { path: "src/app/page.tsx", size: 2000 },
      { path: "src/app/page.test.tsx", size: 1000 },
      { path: ".env", size: 10 },
    ],
    {
      include: "src/**,.env",
      exclude: "**/*.test.tsx",
    },
  );

  assert.deepEqual(
    result.selected.map((file) => file.path),
    ["src/app/page.tsx"],
  );
  assert.equal(
    result.skipped.find((file) => file.path === ".env")?.reason,
    "suspicious_secret",
  );
  assert.equal(
    result.skipped.find((file) => file.path === "README.md")?.reason,
    "not_included_by_user",
  );
  assert.equal(
    result.skipped.find((file) => file.path === "src/app/page.test.tsx")?.reason,
    "excluded_by_user",
  );
});

test("detects sensitive paths and content", () => {
  assert.equal(hasSensitivePath(".env.local"), true);
  assert.equal(hasSensitivePath("config/service-role.json"), true);
  assert.equal(hasSensitiveContent("OPENAI_API_KEY=sk-example"), true);
  assert.equal(hasSensitiveContent("const value = 'safe';"), false);
});

test("deep mode selects more files than fast mode", () => {
  const files = Array.from({ length: 20 }, (_, index) => ({
    path: `src/file-${index}.ts`,
    size: 1000,
  }));

  assert.equal(selectContextFiles(files, { depth: "fast" }).selected.length, 7);
  assert.equal(selectContextFiles(files, { depth: "deep" }).selected.length, 20);
});
