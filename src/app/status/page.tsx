import Link from "next/link";

import { SiteFooter, SiteNav } from "@/components/site-chrome";
import { getStatusSnapshot } from "@/integrations/status-snapshot";

function label(value: string): string {
  return value.replace(/_/gu, " ").replace(/\b\w/gu, (char) => char.toUpperCase());
}

export default function StatusPage() {
  const status = getStatusSnapshot();
  const rows = [
    ["App", status.app, "The web app is available."],
    ["GitHub", status.github, status.github === "configured" ? "Using a server-side GitHub token." : "Using anonymous public repository access."],
    ["Model provider", status.chat, status.chat === "configured" ? "Chat generation is configured server-side." : "Chat generation is not configured."],
    ["Database/cache", status.database, status.database === "configured" ? "Report cache and storage can store data." : "Report storage is disabled."],
  ];

  return (
    <main className="library-shell">
      <SiteNav />
      <section className="status-page">
        <div className="section-header">
          <p className="kicker">Service status</p>
          <h1>System status for Repo2Prompts.</h1>
          <p className="intro">
            Product-facing status for generation, GitHub access, cache, and rate
            limiting. Secrets and provider keys are never shown here.
          </p>
        </div>

        <div className="status-grid">
          {rows.map(([name, state, description]) => (
            <article key={name}>
              <span className={`status-dot ${state === "disabled" ? "disabled" : ""}`} />
              <div>
                <h2>{name}</h2>
                <strong>{label(state)}</strong>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>

        <section className="analysis-card">
          <h2>Rate limit</h2>
          <div className="analysis-strip">
            <span>Backend: {status.rateLimit.backend}</span>
            <span>Failure mode: {status.rateLimit.dbFailureMode}</span>
            <span>Window: {status.rateLimit.windowMs}ms</span>
            <span>Max: {status.rateLimit.max}</span>
          </div>
          <p className="muted">
            This page summarizes configuration state only. It does not reveal
            API keys, service-role keys, or provider credentials.
          </p>
        </section>

        <div className="hero-actions">
          <Link href="/api/status">Open JSON status</Link>
          <Link href="/">Generate a report</Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
