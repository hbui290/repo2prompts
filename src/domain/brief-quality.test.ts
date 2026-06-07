import assert from "node:assert/strict";
import test from "node:test";

import { validateBriefQuality } from "./brief-quality";

test("detects missing headings and invalid citations", () => {
  const quality = validateBriefQuality({
    brief: "# Product purpose\nShort claim [missing.ts]",
    mode: "build",
    depth: "balanced",
    selectedPaths: ["src/app.ts"],
  });
  assert.equal(quality.passed, false);
  assert.equal(quality.warnings.some((warning) => warning.includes("heading")), true);
  assert.equal(quality.warnings.some((warning) => warning.includes("citation")), true);
});

test("accepts a sufficiently complete cited fast brief", () => {
  const body = [
    "# Product purpose",
    "# Observed evidence",
    "# User-visible capabilities",
    "# Architecture and data flow",
    "# External integrations",
    "# Implementation sequence",
    "# Verification plan",
    "# Inferences and unknowns",
    "Observed evidence from [src/app.ts].",
    "x".repeat(600),
  ].join("\n\n");
  const quality = validateBriefQuality({
    brief: body,
    mode: "build",
    depth: "fast",
    selectedPaths: ["src/app.ts"],
  });
  assert.equal(quality.passed, true);
});
