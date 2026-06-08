import { SiteFooter, SiteNav } from "@/components/site-chrome";
import { computeAgentReadiness } from "@/domain/agent-readiness";
import { EXAMPLE_REPORTS } from "@/domain/example-reports";
import { listStoredBriefs } from "@/integrations/brief-store";
import { briefTakeaway, ReportCard } from "@/components/report-card";

export default async function LibraryPage() {
  const briefs = await listStoredBriefs(null);

  return (
    <main className="library-shell">
      <SiteNav />
      <header className="library-header">
        <p className="kicker">Durable evidence</p>
        <h1>Reports</h1>
        <p className="intro">
          Browse example reports and saved generated reports in one place.
          Scan by repo, mode, readiness, safety, and the strongest takeaway.
        </p>
      </header>
      <section className="library-group gallery-grid">
        <div className="library-group-heading">
          <p className="kicker">Start here</p>
          <h2>Example reports</h2>
          <p>Use these to understand the output before generating your own.</p>
        </div>
        <div className="report-card-grid">
          {EXAMPLE_REPORTS.map((report) => {
            const readiness = report.evidence_json.readiness ?? computeAgentReadiness({
              repository: report.repository_key,
              mode: report.analysis_mode,
              depth: report.analysis_depth,
              brief: report.brief_markdown,
              evidence: report.evidence_json,
            });
            return (
              <ReportCard
                key={report.slug}
                href={`/examples/${report.slug}`}
                repository={report.repository_key}
                title={report.title}
                summary={briefTakeaway(report.brief_markdown)}
                mode={report.analysis_mode}
                depth={report.analysis_depth}
                score={readiness.score}
                safety={readiness.safety.level}
                cta="Open sample report"
              />
            );
          })}
        </div>
      </section>
      <section className="library-group gallery-grid">
        <div className="library-group-heading">
          <p className="kicker">Your generated reports</p>
          <h2>Saved reports</h2>
          <p>Reports generated through the app appear here when storage is configured.</p>
        </div>
        <div className="report-card-grid">
        {briefs.length ? (
          briefs.map((brief) => {
            const readiness = brief.evidence_json.readiness ?? computeAgentReadiness({
              repository: brief.repository_key,
              mode: brief.analysis_mode,
              depth: brief.analysis_depth,
              brief: brief.brief_markdown,
              evidence: brief.evidence_json,
            });
            return (
              <ReportCard
                key={brief.id}
                href={`/library/${brief.id}`}
                repository={brief.repository_key}
                title={brief.title}
                summary={briefTakeaway(brief.brief_markdown)}
                mode={brief.analysis_mode}
                depth={brief.analysis_depth}
                score={readiness.score}
                safety={readiness.safety.level}
                createdAt={brief.created_at}
                views={brief.view_count}
              />
            );
          })
        ) : (
          <div className="library-empty">
            No stored briefs. Configure the optional database and generate the
            first brief.
          </div>
        )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
