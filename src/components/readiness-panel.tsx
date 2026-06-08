import type { AgentReadinessReport } from "@/domain/agent-readiness";

type ReadinessPanelProps = {
  readiness?: AgentReadinessReport;
  compact?: boolean;
};

function titleCase(value: string): string {
  return value.replace(/_/gu, " ").replace(/\b\w/gu, (char) => char.toUpperCase());
}

function readinessSummary(score: number, label: string): string {
  return `Score ${score}/100 estimates how ready this repository report is for a coding agent to use. It checks documentation, setup clarity, architecture signals, tests, task clarity, and risk. ${label} is the current readiness band, not a guarantee of repository quality.`;
}

export function ReadinessPanel({ readiness, compact = false }: ReadinessPanelProps) {
  if (!readiness) {
    return (
      <section className="readiness-card compact">
        <div>
          <p className="kicker">Agent Readiness</p>
          <h2>AI Ready unknown</h2>
          <p className="readiness-explainer">
            Readiness is a deterministic score for how usable this report is for a coding agent.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={`readiness-card${compact ? " compact" : ""}`}>
      <div className="readiness-hero">
        <div>
          <p className="kicker">Agent Readiness</p>
          <h2>{readiness.score}/100</h2>
          <p>{readiness.label}</p>
          <p className="readiness-explainer">
            {compact
              ? "A quick signal for how much useful evidence the agent has."
              : readinessSummary(readiness.score, readiness.label)}
          </p>
        </div>
        <div className="readiness-meta">
          <span>Confidence: {titleCase(readiness.confidence)}</span>
          <span>Safety: {titleCase(readiness.safety.level)}</span>
        </div>
      </div>

      {!compact ? (
        <>
          <div className="readiness-breakdown">
            {readiness.breakdown.map((item) => (
              <div key={item.key}>
                <span>
                  {item.label} <strong>{item.score}/{item.max}</strong>
                </span>
                <div className="score-bar" aria-hidden="true">
                  <i style={{ width: `${Math.round((item.score / item.max) * 100)}%` }} />
                </div>
                {item.reasons[0] ? <small>{item.reasons[0]}</small> : null}
              </div>
            ))}
          </div>

          <div className="readiness-grid">
            <article>
              <h3>Strengths</h3>
              <ul>
                {(readiness.strengths.length ? readiness.strengths : ["No strong signals recorded."]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article>
              <h3>Improve next</h3>
              <ul>
                {(readiness.improvements.length ? readiness.improvements : ["No immediate improvement recorded."]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>

          <article className="readiness-prompt">
            <h3>Best next agent prompt</h3>
            <pre>{readiness.bestNextPrompt}</pre>
          </article>

          <div className="readiness-grid">
            <article>
              <h3>Verification commands</h3>
              <ul>
                {(readiness.verificationCommands.length ? readiness.verificationCommands : ["No clear verification command found."]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article>
              <h3>Safety warnings</h3>
              <ul>
                {(readiness.safety.warnings.length ? readiness.safety.warnings : ["No critical issues found by configured checks."]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
          <p className="muted">{readiness.safety.disclaimer}</p>
        </>
      ) : null}
    </section>
  );
}
