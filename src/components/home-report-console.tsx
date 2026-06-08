"use client";

import Link from "next/link";

import type { AgentReadinessReport } from "@/domain/agent-readiness";
import type { HomeDepth, HomeMode } from "./home-mode-selector";

type QuickResponse = {
  brief?: string;
  reportId?: string;
  reportUrl?: string;
  evidence?: {
    filesRead?: number;
    selectedFiles?: Array<{ path: string; reason?: string; estimatedTokens?: number }>;
    readiness?: AgentReadinessReport;
  };
  error?: { message: string };
};

const MODE_PREVIEW: Record<HomeMode, { title: string; risk: string; check: string; prompt: string }> = {
  build: {
    title: "Implementation brief",
    risk: "Unknown setup and route boundaries are called out before code changes.",
    check: "Run tests and build after the smallest scoped change.",
    prompt: "Implement only against cited files and avoid unrelated refactors.",
  },
  review: {
    title: "Review checklist",
    risk: "Missing tests, risky edges, and weak evidence are separated.",
    check: "Verify each finding against source before opening an issue.",
    prompt: "Review these files and return only evidence-backed findings.",
  },
  debug: {
    title: "Debugging map",
    risk: "Likely failure points are grouped by runtime path.",
    check: "Reproduce, inspect logs, then patch the smallest boundary.",
    prompt: "Trace the failure path in order before changing code.",
  },
  migration: {
    title: "Migration plan",
    risk: "Rollback and sequencing risks are visible before touching code.",
    check: "Lock current behavior with tests before replacing internals.",
    prompt: "Migrate in phases and preserve public behavior.",
  },
  prompt: {
    title: "Agent handoff",
    risk: "Unknowns and boundaries are included so the agent does not hallucinate.",
    check: "Use the handoff as the first message, then verify outputs.",
    prompt: "Use this evidence pack as the initial agent instruction.",
  },
};

function snippet(markdown: string): string {
  return markdown
    .replace(/^#+\s+/gmu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 190);
}

function reportHref(result: QuickResponse): string | null {
  if (result.reportUrl) return result.reportUrl;
  if (result.reportId) return `/library/${result.reportId}`;
  return null;
}

export function HomeReportConsole({
  result,
  loading,
  mode,
  depth,
}: {
  result: QuickResponse | null;
  loading: boolean;
  mode: HomeMode;
  depth: HomeDepth;
}) {
  const preview = MODE_PREVIEW[mode];
  const readiness = result?.evidence?.readiness;
  const selectedFiles = result?.evidence?.selectedFiles ?? [];
  const href = result ? reportHref(result) : null;

  return (
    <aside className={`hero-output report-console ${loading ? "is-scanning" : ""}`} aria-live="polite">
      <div className="console-topline">
        <span className="preview-pill">Report console</span>
        <span>{mode} / {depth}</span>
      </div>

      {result?.error ? (
        <div className="hero-result console-state">
          <h2>Request failed</h2>
          <p>{result.error.message}</p>
          <Link href="#top">Adjust options</Link>
        </div>
      ) : loading ? (
        <div className="hero-result console-state">
          <h2>Scanning repository evidence</h2>
          <p className="readiness-note">Selecting files, filtering noise, and shaping the {preview.title.toLowerCase()}.</p>
          <div className="scan-stack">
            <span>resolve repository</span>
            <span>read source tree</span>
            <span>select evidence</span>
            <span>write report</span>
          </div>
        </div>
      ) : result?.brief ? (
        <div className="hero-result console-state">
          <h2>
            AI Ready {readiness?.score ?? "unknown"}
            {readiness?.label ? ` · ${readiness.label}` : ""}
          </h2>
          <p className="readiness-note">
            {result.evidence?.filesRead ?? 0} files read · {selectedFiles.length} selected · {preview.title}
          </p>
          <p>{snippet(result.brief)}</p>
          <div className="console-proof-grid">
            <div>
              <span>Top evidence</span>
              <strong>{selectedFiles[0]?.path ?? "selected source files"}</strong>
            </div>
            <div>
              <span>Risk lens</span>
              <strong>{preview.risk}</strong>
            </div>
            <div>
              <span>Next prompt</span>
              <strong>{readiness?.bestNextPrompt ? snippet(readiness.bestNextPrompt) : preview.prompt}</strong>
            </div>
          </div>
          <div className="hero-actions">
            {href ? <Link href={href}>Open full report</Link> : null}
          </div>
        </div>
      ) : (
        <div className="hero-result console-state">
          <h2>{preview.title}</h2>
          <p className="readiness-note">AI Ready 82 · Strong · sample report anatomy</p>
          <div className="console-proof-grid">
            <div>
              <span>Confirmed</span>
              <strong>README, routes, manifests, and source entrypoints.</strong>
            </div>
            <div>
              <span>Risk</span>
              <strong>{preview.risk}</strong>
            </div>
            <div>
              <span>Checks</span>
              <strong>{preview.check}</strong>
            </div>
            <div>
              <span>Agent handoff</span>
              <strong>{preview.prompt}</strong>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
