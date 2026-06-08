import { computeAgentReadiness } from "@/domain/agent-readiness";
import { buildReportArtifact, type ReportArtifactSection } from "@/domain/report-artifact";
import type { StoredBrief } from "@/integrations/brief-store";
import { ReportSectionNav } from "./report-section-nav";
import { ReportUtilities } from "./report-utilities";

type ReportViewProps = {
  brief: Pick<
    StoredBrief,
    | "repository_key"
    | "analysis_mode"
    | "analysis_depth"
    | "title"
    | "brief_markdown"
    | "evidence_json"
    | "created_at"
    | "view_count"
  >;
  shareUrl?: string;
};

function safeFilename(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "") || "brief";
}

function InlineText({ value }: { value: string }) {
  const parts = value.split(/(`[^`]+`|\[[^\]]+\])/u);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>;
        }
        if (part.startsWith("[") && part.endsWith("]")) {
          return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>;
        }
        return part;
      })}
    </>
  );
}

function ArtifactList({ title, items }: { title: string; items: string[] }) {
  return (
    <article>
      <h2>{title}</h2>
      <ul>
        {items.map((item) => <li key={item}><InlineText value={item} /></li>)}
      </ul>
    </article>
  );
}

function FilePanel({
  title,
  files,
  limit = 24,
}: {
  title: string;
  files: Array<{ path: string; reason?: string; estimatedTokens?: number; size?: number }> | undefined;
  limit?: number;
}) {
  const rows = files ?? [];
  return (
    <article>
      <h2>{title}</h2>
      {rows.length ? (
        <ul className="file-list">
          {rows.slice(0, limit).map((file) => (
            <li key={`${title}-${file.path}-${file.reason ?? ""}`}>
              <span className="file-path" title={file.path}>{file.path}</span>
              <small className="file-meta">
                {file.estimatedTokens ? `${file.estimatedTokens} tokens` : null}
                {file.reason ? ` ${file.reason}` : null}
              </small>
            </li>
          ))}
          {rows.length > limit ? <li className="muted">+{rows.length - limit} more in advanced evidence</li> : null}
        </ul>
      ) : (
        <p className="muted">No files recorded.</p>
      )}
    </article>
  );
}

function ModeSection({ section }: { section: ReportArtifactSection }) {
  const itemLimit = section.tone === "prompt" ? section.items.length : 4;
  return (
    <section className={`mode-section ${section.tone ?? "default"}`}>
      <div className="mode-section-heading">
        <span>{section.tone === "warning" ? "Risk" : section.tone === "prompt" ? "Handoff" : "Insight"}</span>
        <h2>{section.title}</h2>
      </div>
      {section.tone === "prompt" ? (
        <pre>{section.items.join("\n\n")}</pre>
      ) : (
        <ul>
          {section.items.slice(0, itemLimit).map((item) => <li key={`${section.title}-${item}`}><InlineText value={item} /></li>)}
          {section.items.length > itemLimit ? <li className="muted">+{section.items.length - itemLimit} more detail in export</li> : null}
        </ul>
      )}
    </section>
  );
}

function scoreMeta(scoreLabel: string): { value: number | null; label: string; tone: "limited" | "usable" | "strong" } {
  const match = scoreLabel.match(/^(\d+)\/100\s*(.*)$/u);
  if (!match) return { value: null, label: scoreLabel, tone: "limited" };
  const value = Number(match[1]);
  const label = match[2]?.trim() || "Score";
  return {
    value,
    label,
    tone: value >= 80 ? "strong" : value >= 60 ? "usable" : "limited",
  };
}

function truthCountLabel(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function ReportView({ brief, shareUrl }: ReportViewProps) {
  const evidence = brief.evidence_json ?? {};
  const readiness = evidence.readiness ?? computeAgentReadiness({
    repository: brief.repository_key,
    mode: brief.analysis_mode,
    depth: brief.analysis_depth,
    brief: brief.brief_markdown,
    evidence,
  });
  const analysis = evidence.analysis;
  const artifact = buildReportArtifact({ brief, readiness });
  const score = scoreMeta(artifact.qualitySnapshot.scoreLabel);
  const keyEvidence = artifact.evidenceGroups.selected.slice(0, 8);

  return (
    <article className="brief-detail report-detail">
      <header className="report-header-v2">
        <div>
          <p className="kicker">Evidence-backed report</p>
          <h1>{brief.title}</h1>
          <p className="intro">
            {brief.repository_key} · {brief.analysis_mode ?? "build"} ·{" "}
            {brief.analysis_depth ?? "fast"} ·{" "}
            {new Date(brief.created_at).toLocaleDateString()}
            {brief.view_count ? ` · ${brief.view_count} views` : ""}
          </p>
        </div>
      </header>

      <ReportSectionNav />

      <section id="report-verdict" className={`report-hero-card ${artifact.verdict.tone}`}>
        <div className="score-orb" aria-label={artifact.qualitySnapshot.scoreLabel}>
          <span>{score.value ?? "—"}</span>
          <small>{score.value === null ? "score" : "/100"}</small>
        </div>
        <div className="report-hero-copy">
          <div className="report-badge-row">
            <span className={`report-pill ${score.tone}`}>{score.label}</span>
            <span className="report-pill">{artifact.qualitySnapshot.implementationConfidence}</span>
            <span className="report-pill">{artifact.qualitySnapshot.verificationClarity}</span>
          </div>
          <h2>{artifact.verdict.title}</h2>
          <p>{artifact.verdict.detail}</p>
        </div>
        <div className="report-hero-metrics">
          <div>
            <strong>{artifact.qualitySnapshot.evidenceCoverage}</strong>
            <small>evidence coverage</small>
          </div>
          <div>
            <strong>{artifact.qualitySnapshot.riskSignal}</strong>
            <small>risk signal</small>
          </div>
        </div>
      </section>

      <section className="primary-next-action report-action-dock">
        <div>
          <p className="kicker">Best next action</p>
          <h2>{artifact.primaryAction.label}</h2>
          <p>{artifact.primaryAction.detail}</p>
          <ul>
            {artifact.primaryAction.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
          </ul>
        </div>
        <ReportUtilities
          brief={brief.brief_markdown}
          filename={safeFilename(brief.repository_key)}
          repository={brief.repository_key}
          mode={brief.analysis_mode}
          depth={brief.analysis_depth}
          evidence={{ ...evidence, analysis }}
          shareUrl={shareUrl}
          primaryAction={artifact.primaryAction}
        />
      </section>

      <section id="report-truth" className="truth-table">
        <article className="truth-summary-card confirmed-card">
          <span>Confirmed</span>
          <strong>{truthCountLabel(artifact.confirmed.length, "fact")}</strong>
          <p>{artifact.confirmed[0]}</p>
          <details>
            <summary>View facts</summary>
            <ArtifactList title="Confirmed" items={artifact.confirmed} />
          </details>
        </article>
        <article className="truth-summary-card inferred-card">
          <span>Inferred</span>
          <strong>{truthCountLabel(artifact.inferred.length, "insight")}</strong>
          <p>{artifact.inferred[0]}</p>
          <details>
            <summary>View reasoning</summary>
            <ArtifactList title="Inferred" items={artifact.inferred} />
          </details>
        </article>
        <article className="truth-summary-card unknown-card">
          <span>Unknown</span>
          <strong>{truthCountLabel(artifact.unknown.length, "gap")}</strong>
          <p>{artifact.unknown[0]}</p>
          <details>
            <summary>View gaps</summary>
            <ArtifactList title="Unknown" items={artifact.unknown} />
          </details>
        </article>
      </section>

      <section id="report-body" className="mode-report-body">
        {artifact.modeSections.map((section) => <ModeSection key={section.title} section={section} />)}
      </section>

      <section id="report-evidence" className="evidence-panel">
        <div className="section-heading">
          <p className="kicker">Evidence</p>
          <h2>Key source files behind the report</h2>
          <p className="section-note">Showing the strongest selected files first. Full skipped and largest-file lists stay available for audit.</p>
        </div>
        <div className="evidence-grid report-evidence key-evidence-grid">
          <FilePanel title="Key evidence" files={keyEvidence} limit={8} />
          <article>
            <h2>Reasons selected</h2>
            {artifact.evidenceGroups.reasons.length ? (
              <ul className="file-list reason-list evidence-card-list">
                {artifact.evidenceGroups.reasons.map((group) => (
                  <li key={group.reason}>
                    <span className="reason-label">{group.reason}</span>
                    <small className="reason-paths">
                      {group.paths.map((item) => (
                        <span key={`${group.reason}-${item}`}>{item}</span>
                      ))}
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No selection reasons recorded.</p>
            )}
          </article>
        </div>
        <details className="technical-details advanced-evidence">
          <summary>Advanced evidence and raw selection data</summary>
          <div className="evidence-grid report-evidence">
            <FilePanel title="All selected evidence" files={artifact.evidenceGroups.selected} />
            <FilePanel title="Skipped files" files={artifact.evidenceGroups.skipped} />
            <FilePanel title="Largest files" files={artifact.evidenceGroups.largest} />
          </div>
        </details>
      </section>

      <section id="report-quality" className="quality-snapshot">
        <div className="section-heading">
          <p className="kicker">Quality snapshot</p>
          <h2>Supporting signals</h2>
        </div>
        <div className="quality-grid">
          <div>
            <span>{artifact.qualitySnapshot.evidenceCoverage}</span>
            <small>evidence coverage</small>
          </div>
          <div>
            <span>{artifact.qualitySnapshot.implementationConfidence}</span>
            <small>confidence</small>
          </div>
          <div>
            <span>{artifact.qualitySnapshot.verificationClarity}</span>
            <small>verification clarity</small>
          </div>
          <div>
            <span>{artifact.qualitySnapshot.riskSignal}</span>
            <small>risk signal</small>
          </div>
          <div>
            <span>{artifact.qualitySnapshot.scoreLabel}</span>
            <small>heuristic readiness</small>
          </div>
        </div>
        {artifact.qualitySnapshot.technicalDetails.length || analysis?.quality?.warnings?.length ? (
          <details className="technical-details">
            <summary>Technical details</summary>
            <ul>
              {artifact.qualitySnapshot.technicalDetails.map((item) => <li key={item}>{item}</li>)}
              {(analysis?.quality?.warnings ?? []).map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </details>
        ) : null}
      </section>
    </article>
  );
}
