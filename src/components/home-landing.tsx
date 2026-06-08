"use client";

import Link from "next/link";
import { useState } from "react";

import type { AgentReadinessReport } from "@/domain/agent-readiness";
import type { ContextPack } from "@/domain/context-pack";
import { EXAMPLE_REPORTS } from "@/domain/example-reports";
import { ContextPackPreview } from "./context-pack-preview";
import { HomeBeforeAfter } from "./home-before-after";
import { HomeModeSelector, type HomeDepth, type HomeMode, type HomeVisibleDepth } from "./home-mode-selector";
import { HomeReportAnatomy } from "./home-report-anatomy";
import { HomeReportConsole } from "./home-report-console";

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

type ContextPackResponse = {
  contextPack?: ContextPack;
  error?: { message: string };
};

const SAMPLE_REPO = "vercel/ai";
const proofItems = [
  ["Finds context", "README, routes, manifests, and source entrypoints."],
  ["Cuts noise", "Generated files, sensitive paths, and oversized blobs stay out."],
  ["Shows risk", "Unknowns, checks, and risky edges are separated from facts."],
  ["Copies out", "Markdown, Codex, Cursor, Claude, and evidence JSON exports."],
];

function snippet(markdown: string): string {
  return markdown
    .replace(/^#+\s+/gmu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 170);
}

export function HomeLanding({
  initialAdvanced = false,
  initialRepository = "",
}: {
  initialAdvanced?: boolean;
  initialRepository?: string;
}) {
  const [repository, setRepository] = useState(initialRepository);
  const [mode, setMode] = useState<HomeMode>("build");
  const [depth, setDepth] = useState<HomeVisibleDepth>("balanced");
  const [inspectQuestion, setInspectQuestion] = useState(false);
  const [question, setQuestion] = useState("");
  const [include, setInclude] = useState("");
  const [exclude, setExclude] = useState("");
  const [contextPack, setContextPack] = useState<ContextPack | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [result, setResult] = useState<QuickResponse | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  function togglePath(path: string) {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  function handleTogglePathsBatch(paths: string[], check: boolean) {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      for (const p of paths) {
        if (check) {
          next.add(p);
        } else {
          next.delete(p);
        }
      }
      return next;
    });
  }

  function clearGeneratedOutput() {
    setContextPack(null);
    setContextError(null);
    setResult(null);
    setSelectedPaths(new Set());
  }

  function requestPayload() {
    const requestDepth: HomeDepth = inspectQuestion ? "focused" : depth;
    return {
      repository,
      mode,
      depth: requestDepth,
      question: inspectQuestion ? question.trim() : undefined,
      include: include.trim() || undefined,
      exclude: exclude.trim() || undefined,
    };
  }

  async function buildContextPack(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (inspectQuestion && !question.trim()) {
      setContextError("Inspect one question needs a specific question for the analyzer.");
      return;
    }
    setContextLoading(true);
    setContextError(null);
    setContextPack(null);
    setResult(null);

    try {
      const response = await fetch("/api/context-pack", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestPayload()),
      });
      const body = (await response.json()) as ContextPackResponse;
      if (!response.ok || body.error) {
        setContextError(body.error?.message ?? "The context pack could not be built.");
        return;
      }
      if (body.contextPack) {
        setContextPack(body.contextPack);
        setSelectedPaths(new Set(body.contextPack.selectedFiles.map((f) => f.path)));
      } else {
        setContextPack(null);
        setSelectedPaths(new Set());
      }
    } catch {
      setContextError("The request could not reach the server.");
    } finally {
      setContextLoading(false);
    }
  }

  async function generateReport() {
    if (inspectQuestion && !question.trim()) {
      setContextError("Inspect one question needs a specific question for the analyzer.");
      return;
    }
    setReportLoading(true);
    setResult(null);

    const payload = {
      ...requestPayload(),
      selectedFiles: Array.from(selectedPaths),
    };

    try {
      const response = await fetch("/api/briefs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      setResult((await response.json()) as QuickResponse);
    } catch {
      setResult({ error: { message: "The request could not reach the server." } });
    } finally {
      setReportLoading(false);
    }
  }

  return (
    <div className="landing-shell" id="top">
      <section className="landing-hero">
        <div className="hero-copy">
          <p className="kicker">Repo to prompts</p>
          <h1>Give your agent the repo context first.</h1>
          <p className="intro">
            Paste a GitHub repo. Get selected files, risks, checks, and a
            copy-ready handoff.
          </p>

          <form className="hero-form" onSubmit={buildContextPack}>
            <label>
              Repository
              <input
                value={repository}
                onChange={(event) => {
                  clearGeneratedOutput();
                  setRepository(event.target.value);
                }}
                placeholder="vercel/ai"
                required
              />
            </label>
            <button className="submit" disabled={contextLoading || reportLoading} type="submit">
              {contextLoading ? "Building context..." : contextPack ? "Rebuild context" : "Build context pack"}
            </button>
            <details className="home-advanced-options" open={initialAdvanced}>
              <summary>
                <span>Advanced options</span>
              </summary>
              <div className="advanced-option-grid">
                <article>
                  <HomeModeSelector
                    mode={mode}
                    depth={depth}
                    inspectQuestion={inspectQuestion}
                    onModeChange={(nextMode) => {
                      clearGeneratedOutput();
                      setMode(nextMode);
                    }}
                    onDepthChange={(nextDepth) => {
                      clearGeneratedOutput();
                      setDepth(nextDepth);
                    }}
                    onInspectQuestionChange={(nextValue) => {
                      clearGeneratedOutput();
                      setInspectQuestion(nextValue);
                    }}
                  />
                </article>
                {inspectQuestion ? (
                  <article>
                    <label>
                      What should the agent inspect?
                      <textarea
                        value={question}
                        onChange={(event) => {
                          clearGeneratedOutput();
                          setQuestion(event.target.value);
                        }}
                        placeholder="Which files define the authentication flow?"
                        required={inspectQuestion}
                      />
                    </label>
                    <span className="helper">This sends a focused scan so evidence selection stays narrow.</span>
                  </article>
                ) : null}
                <details className="scope-filter-drawer">
                  <summary>
                    <span>Scope filters</span>
                    <small>Optional</small>
                  </summary>
                  <div>
                    <label>
                      Include
                      <input
                        value={include}
                        onChange={(event) => {
                          clearGeneratedOutput();
                          setInclude(event.target.value);
                        }}
                        placeholder="src/**, app/**, package.json"
                      />
                    </label>
                    <label>
                      Exclude
                      <input
                        value={exclude}
                        onChange={(event) => {
                          clearGeneratedOutput();
                          setExclude(event.target.value);
                        }}
                        placeholder="**/*.test.ts, dist/**, node_modules/**"
                      />
                    </label>
                  </div>
                </details>
              </div>
            </details>
          </form>

          <div className="hero-actions">
            <button
              type="button"
              onClick={() => {
                clearGeneratedOutput();
                setRepository(SAMPLE_REPO);
              }}
            >
              Demo repo: vercel/ai
            </button>
          </div>

          <ContextPackPreview
            contextPack={contextPack}
            loading={contextLoading}
            error={contextError}
            reportLoading={reportLoading}
            onGenerateReport={generateReport}
            selectedPaths={selectedPaths}
            onTogglePath={togglePath}
            onTogglePathsBatch={handleTogglePathsBatch}
          />
        </div>

        <HomeReportConsole
          result={result}
          loading={reportLoading}
          mode={mode}
          depth={inspectQuestion ? "focused" : depth}
        />
      </section>

      <section className="proof-strip" aria-label="Repo2Prompts proof points">
        {proofItems.map(([label, text]) => (
          <article key={label}>
            <span>{label}</span>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <HomeBeforeAfter />

      <HomeReportAnatomy />

      <section className="landing-section">
        <div className="section-header">
          <p className="kicker">Sample reports</p>
          <h2>Open the output before you trust the generator.</h2>
        </div>
        <div className="report-card-grid">
          {EXAMPLE_REPORTS.map((report) => (
            <article className="report-card" key={report.slug}>
              <span>
                {report.slug === "nextjs-build-brief" ? "Start here · " : ""}
                {report.analysis_mode} · {report.analysis_depth}
              </span>
              <h3>{report.title}</h3>
              <p>{report.summary}</p>
              <div className="mini-metrics">
                <span>{report.evidence_json.filesRead ?? 0} files</span>
                <span>{report.evidence_json.selectedFiles?.length ?? 0} selected</span>
              </div>
              <small>{snippet(report.brief_markdown)}</small>
              <Link className="card-link" href={`/examples/${report.slug}`}>Open sample report</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="final-cta">
        <p className="kicker">Ready when your repo is</p>
        <h2>Turn the next repo into a usable agent handoff.</h2>
        <div className="hero-actions">
          <a href="#top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            Build context pack
          </a>
          <Link href="/library">View sample reports</Link>
        </div>
      </section>
    </div>
  );
}
