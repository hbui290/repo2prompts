"use client";

import type { ProgressStep } from "@/domain/workbench-progress";

function isActive(step: ProgressStep, message: string, loading: boolean): boolean {
  return loading && (message === step.message || (!message && step.delayMs === 0));
}

function isComplete(step: ProgressStep, steps: ProgressStep[], message: string, loading: boolean): boolean {
  if (!loading || !message) return false;
  return steps.findIndex((item) => item.message === step.message) < steps.findIndex((item) => item.message === message);
}

export function RunTimeline({
  steps,
  message,
  loading,
}: {
  steps: ProgressStep[];
  message: string;
  loading: boolean;
}) {
  const visibleSteps = steps.filter((step) => step.delayMs < 30_000);
  return (
    <div className={`run-timeline ${loading ? "running" : ""}`} aria-label="Generation progress">
      {visibleSteps.map((step, index) => (
        <div
          key={step.message}
          className={[
            isActive(step, message, loading) ? "active" : "",
            isComplete(step, visibleSteps, message, loading) ? "complete" : "",
          ].filter(Boolean).join(" ")}
        >
          <span>{String(index + 1).padStart(2, "0")}</span>
          <p>{step.message}</p>
        </div>
      ))}
    </div>
  );
}
