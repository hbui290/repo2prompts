import type { AnalysisDepth } from "./brief-prompt";

export type ProgressStep = {
  delayMs: number;
  message: string;
};

const BASE_STEPS: ProgressStep[] = [
  { delayMs: 0, message: "Preparing request..." },
  { delayMs: 800, message: "Collecting repository evidence..." },
  { delayMs: 2_000, message: "Selecting files and estimating context..." },
];

const LONG_RUNNING_STEPS: ProgressStep[] = [
  { delayMs: 30_000, message: "Still working. Deep repositories can take a few minutes." },
  { delayMs: 75_000, message: "This is taking longer than expected. You can wait, or retry with Balanced." },
];

export function progressStepsForDepth(depth: AnalysisDepth): ProgressStep[] {
  const depthSteps: ProgressStep[] =
    depth === "deep"
      ? [
          { delayMs: 4_000, message: "Building module map..." },
          { delayMs: 7_000, message: "Analyzing modules. Deep mode can take longer..." },
          { delayMs: 12_000, message: "Writing final brief..." },
        ]
      : depth === "balanced" || depth === "focused"
        ? [
            { delayMs: 4_000, message: "Building repository map..." },
            { delayMs: 8_000, message: "Writing brief..." },
          ]
        : [{ delayMs: 4_000, message: "Writing brief..." }];

  return [...BASE_STEPS, ...depthSteps, ...LONG_RUNNING_STEPS];
}
