const anatomy = [
  ["Verdict", "Readiness and whether the report is safe to hand to an agent."],
  ["Truth table", "Confirmed, inferred, and unknown claims split apart."],
  ["Risk areas", "Mode-specific risks, missing clarity, and failure edges."],
  ["Checks", "Verification commands and human review checklist."],
  ["Evidence", "Selected files, skipped files, and why they were chosen."],
  ["Exports", "Markdown, Codex, Cursor, Claude, evidence JSON."],
];

export function HomeReportAnatomy() {
  return (
    <section className="landing-section anatomy-section">
      <div className="section-header">
        <p className="kicker">What you get</p>
        <h2>One report your agent can act on and you can verify.</h2>
      </div>
      <div className="anatomy-map">
        {anatomy.map(([title, text], index) => (
          <article key={title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
