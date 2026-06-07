"use client";

import { useState } from "react";

type Depth = "fast" | "thorough" | "focused";

type BriefResponse = {
  brief?: string;
  evidence?: { filesRead: number; treeEntries: number };
  error?: { message: string };
};

export function BriefWorkbench() {
  const [repository, setRepository] = useState("");
  const [depth, setDepth] = useState<Depth>("fast");
  const [question, setQuestion] = useState("");
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
        body: JSON.stringify({ repository, depth, question }),
      });
      setResult((await response.json()) as BriefResponse);
    } catch {
      setResult({ error: { message: "The request could not reach the server." } });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="workbench">
      <form className="request-panel" onSubmit={submit}>
        <div>
          <p className="kicker">Repository brief generator</p>
          <h1>Understand a codebase before you build.</h1>
          <p className="intro">
            Enter a public GitHub repository. Receive an evidence-grounded
            implementation brief with architecture, risks, and a build sequence.
          </p>
        </div>

        <label>
          Repository
          <input
            value={repository}
            onChange={(event) => setRepository(event.target.value)}
            placeholder="owner/repository or GitHub URL"
            required
          />
        </label>

        <fieldset>
          <legend>Analysis depth</legend>
          <div className="depth-options">
            {(["fast", "thorough", "focused"] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={depth === option ? "selected" : ""}
                onClick={() => setDepth(option)}
              >
                {option}
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

        <button className="submit" disabled={loading} type="submit">
          {loading ? "Collecting evidence..." : "Generate brief"}
        </button>
      </form>

      <section className="result-panel" aria-live="polite">
        <header>
          <span>Output</span>
          {result?.evidence ? (
            <small>
              {result.evidence.filesRead} files · {result.evidence.treeEntries} tree
              entries
            </small>
          ) : null}
        </header>
        {result?.error ? <p className="error">{result.error.message}</p> : null}
        {result?.brief ? <pre>{result.brief}</pre> : null}
        {!result ? (
          <div className="empty">
            <strong>The brief will appear here.</strong>
            <p>
              It separates repository evidence from inference and calls out
              unknowns explicitly.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

