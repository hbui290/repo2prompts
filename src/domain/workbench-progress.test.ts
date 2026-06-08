import assert from "node:assert/strict";
import test from "node:test";

import { progressStepsForDepth } from "./workbench-progress";

test("returns deep-specific progress milestones with long-running fallbacks", () => {
  const steps = progressStepsForDepth("deep");

  assert.deepEqual(steps.map((step) => step.message), [
    "Preparing request...",
    "Collecting repository evidence...",
    "Selecting files and estimating context...",
    "Building module map...",
    "Analyzing modules. Deep mode can take longer...",
    "Writing final brief...",
    "Still working. Deep repositories can take a few minutes.",
    "This is taking longer than expected. You can wait, or retry with Balanced.",
  ]);
  assert.equal(steps.at(-2)?.delayMs, 30_000);
  assert.equal(steps.at(-1)?.delayMs, 75_000);
});

test("returns repository-map progress for balanced and focused depths", () => {
  assert.deepEqual(
    progressStepsForDepth("balanced").map((step) => step.message),
    [
      "Preparing request...",
      "Collecting repository evidence...",
      "Selecting files and estimating context...",
      "Building repository map...",
      "Writing brief...",
      "Still working. Deep repositories can take a few minutes.",
      "This is taking longer than expected. You can wait, or retry with Balanced.",
    ],
  );

  assert.deepEqual(
    progressStepsForDepth("focused").map((step) => step.message).slice(3, 5),
    ["Building repository map...", "Writing brief..."],
  );
});

test("returns short progress for fast depth", () => {
  assert.deepEqual(
    progressStepsForDepth("fast").map((step) => step.message).slice(0, 4),
    [
      "Preparing request...",
      "Collecting repository evidence...",
      "Selecting files and estimating context...",
      "Writing brief...",
    ],
  );
});
