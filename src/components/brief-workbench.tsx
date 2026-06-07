"use client";

import { useState } from "react";

import { BriefActions } from "./brief-actions";

type Depth = "fast" | "balanced" | "deep" | "focused";
type Mode = "build" | "review" | "debug" | "migration" | "prompt";

type EvidenceFile = {
  path: string;
  size?: number;
  reason?: string;
  estimatedTokens?: number;
};

type BriefResponse = {
  brief?: string;
  source?: "generated" | "cache";
  mode?: Mode;
  depth?: Depth;
  evidence?: {
    filesRead?: number;
    treeEntries?: number;
    estimatedTokens?: number;
    selectedFiles?: EvidenceFile[];
    skippedFiles?: EvidenceFile[];
    largestFiles?: EvidenceFile[];
  };
  analysis?: {
    pipeline: "single_pass" | "repository_map" | "module_map";
    repositoryMapSource: "generated" | "cache" | "not_used";
    modulesAnalyzed: number;
    evidenceFingerprint: string;
    quality: { passed: boolean; warnings: string[]; repaired: boolean };
  };
  error?: { message: string };
};

const SAMPLES = ["vercel/ai", "supabase/supabase", "shadcn-ui/ui"];

const MODES: Array<{ value: Mode; label: string; description: string }> = [
  { value: "build", label: "Build", description: "Implementation brief" },
  { value: "review", label: "Review", description: "Risks and tests" },
  { value: "debug", label: "Debug", description: "Failure paths" },
  { value: "migration", label: "Migration", description: "Refactor plan" },
  { value: "prompt", label: "Prompt", description: "Concise agent prompt" },
];

const DEPTHS: Array<{ value: Depth; label: string; description: string }> = [
  { value: "fast", label: "Fast", description: "Small context" },
  { value: "balanced", label: "Balanced", description: "Default quality" },
  { value: "deep", label: "Deep", description: "More evidence" },
  { value: "focused", label: "Focused", description: "Question-led" },
];

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "") || "brief";
}

function FileList({ files }: { files: EvidenceFile[] }) {
  if (!files.length) return <p className="muted">No files recorded.</p>;
  return (
    <ul className="file-list">
      {files.slice(0, 20).map((file) => (
        <li key={`${file.path}-${file.reason ?? "selected"}`}>
          <span>{file.path}</span>
          <small>
            {file.estimatedTokens ? `${file.estimatedTokens} tokens` : null}
            {file.reason ? ` ${file.reason}` : null}
          </small>
        </li>
      ))}
    </ul>
  );
}

export function BriefWorkbench() {
  const [repository, setRepository] = useState("");
  const [mode, setMode] = useState<Mode>("build");
  const [depth, setDepth] = useState<Depth>("balanced");
  const [question, setQuestion] = useState("");
  const [include, setInclude] = useState("");
  const [exclude, setExclude] = useState("");
  const [result, setResult] = useState<BriefResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/briefs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repository, mode, depth, question, include, exclude }),
      });
      setResult((await response.json()) as BriefResponse);
    } catch {
      setResult({ error: { message: "The request could not reach the server." } });
    } finally {
      setLoading(false);
    }
  }

  const selectedFiles = result?.evidence?.selectedFiles ?? [];
  const skippedFiles = result?.evidence?.skippedFiles ?? [];
  const largestFiles = result?.evidence?.largestFiles ?? [];

  return (
    <div className="workbench">
      <form className="request-panel" onSubmit={submit}>
        <div>
          <p className="kicker">Repository evidence workbench</p>
          <h1>Turn repos into build briefs.</h1>
          <p className="intro">
            Paste a public GitHub repository, choose what kind of brief you need,
            and see the evidence used before you ship it to an agent.
          </p>
        </div>

        <label>
          Repository
          <input
            value={repository}
            onChange={(event) => setRepository(event.target.value)}
            placeholder="owner/repo or https://github.com/owner/repo"
            required
          />
          <span className="helper">Public GitHub repositories only.</span>
        </label>

        <div className="sample-row">
          {SAMPLES.map((sample) => (
            <button key={sample} type="button" onClick={() => setRepository(sample)}>
              {sample}
            </button>
          ))}
        </div>

        <fieldset>
          <legend>Analysis mode</legend>
          <div className="option-grid mode-grid">
            {MODES.map((option) => (
              <button
                key={option.value}
                type="button"
                className={mode === option.value ? "selected" : ""}
                onClick={() => setMode(option.value)}
              >
                <span>{option.label}</span>
                <small>{option.description}</small>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Depth</legend>
          <div className="option-grid depth-options">
            {DEPTHS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={depth === option.value ? "selected" : ""}
                onClick={() => setDepth(option.value)}
              >
                <span>{option.label}</span>
                <small>{option.description}</small>
              </button>
            ))}
          </div>
        </fieldset>

        {depth === "focused" ? (
          <label>
            Question
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Which files define the authentication flow?"
              required
            />
          </label>
        ) : null}

        <details className="advanced-filters">
          <summary>Advanced filters</summary>
          <label>
            Include
            <input
              value={include}
              onChange={(event) => setInclude(event.target.value)}
              placeholder="src/**, app/**, package.json"
            />
          </label>
          <label>
            Exclude
            <input
              value={exclude}
              onChange={(event) => setExclude(event.target.value)}
              placeholder="**/*.test.ts, dist/**, node_modules/**"
            />
          </label>
        </details>

        <button className="submit" disabled={loading} type="submit">
          {loading ? "Collecting evidence..." : "Generate brief"}
        </button>
      </form>

      <section className="result-panel" aria-live="polite">
        <header>
          <span>Output</span>
          {result?.evidence ? (
            <small>
              {result.evidence.filesRead ?? 0} files ·{" "}
              {result.evidence.treeEntries ?? 0} tree entries ·{" "}
              {result.evidence.estimatedTokens ?? 0} est. tokens
            </small>
          ) : null}
        </header>
        {result?.error ? <p className="error">{result.error.message}</p> : null}
        {result?.brief ? (
          <>
            {result.analysis ? (
              <div className="analysis-strip">
                <span>{result.analysis.pipeline.replaceAll("_", " ")}</span>
                <span>Map: {result.analysis.repositoryMapSource}</span>
                <span>{result.analysis.modulesAnalyzed} modules</span>
                <span>{result.analysis.quality.passed ? "Quality passed" : "Quality warnings"}</span>
                {result.analysis.quality.repaired ? <span>Repaired</span> : null}
              </div>
            ) : null}
            {result.analysis?.quality.warnings.length ? (
              <ul className="quality-warnings">
                {result.analysis.quality.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            ) : null}
            <BriefActions
              brief={result.brief}
              evidence={result.evidence}
              filename={slug(repository)}
            />
            <pre>{result.brief}</pre>
            <div className="evidence-grid">
              <article>
                <h2>Selected files</h2>
                <FileList files={selectedFiles} />
              </article>
              <article>
                <h2>Skipped files</h2>
                <FileList files={skippedFiles} />
              </article>
              <article>
                <h2>Largest files</h2>
                <FileList files={largestFiles} />
              </article>
            </div>
          </>
        ) : null}
        {!result ? (
          <div className="empty">
            <strong>Sample output preview</strong>
            <p>
              A generated brief will show source files read, skipped files,
              estimated tokens, architecture notes, risks, and a verification plan.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
