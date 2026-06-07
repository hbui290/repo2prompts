import { SiteNav } from "@/components/site-chrome";
import { listStoredBriefs } from "@/integrations/brief-store";

export default async function LibraryPage() {
  const briefs = await listStoredBriefs(null);

  return (
    <main className="library-shell">
      <SiteNav />
      <header className="library-header">
        <p className="kicker">Durable evidence</p>
        <h1>Brief library</h1>
        <p className="intro">
          Previously generated implementation briefs from the configured
          database.
        </p>
      </header>
      <section className="brief-list">
        {briefs.length ? (
          briefs.map((brief) => (
            <article key={brief.id}>
              <div>
                <p>{brief.repository_key}</p>
                <h2>{brief.title}</h2>
              </div>
              <p>{brief.brief_markdown.slice(0, 280)}</p>
              <small>
                {new Date(brief.created_at).toLocaleDateString()} ·{" "}
                {brief.view_count} views
              </small>
            </article>
          ))
        ) : (
          <div className="library-empty">
            No stored briefs. Configure the optional database and generate the
            first brief.
          </div>
        )}
      </section>
    </main>
  );
}
