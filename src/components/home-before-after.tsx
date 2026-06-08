export function HomeBeforeAfter() {
  return (
    <section className="landing-section before-after-section">
      <div className="section-header">
        <p className="kicker">Before / after</p>
        <h2>A repo URL is not enough context.</h2>
      </div>
      <div className="before-after-grid">
        <article className="before-card">
          <span>Generic prompt</span>
          <h3>“Look at this repo and implement the feature.”</h3>
          <ul>
            <li>No selected files.</li>
            <li>No setup or risk boundaries.</li>
            <li>No verification path.</li>
          </ul>
        </article>
        <article className="after-card">
          <span>Repo2Prompts report</span>
          <h3>Selected files, risks, checks, and a handoff the agent can follow.</h3>
          <ul>
            <li>Selected source evidence and skipped noise.</li>
            <li>Confirmed, inferred, and unknown separated.</li>
            <li>Copyable output for Codex, Cursor, Claude, and Markdown.</li>
          </ul>
        </article>
      </div>
    </section>
  );
}
