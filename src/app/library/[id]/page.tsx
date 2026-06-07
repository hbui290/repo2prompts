import { notFound } from "next/navigation";

import { BriefActions } from "@/components/brief-actions";
import { SiteFooter, SiteNav } from "@/components/site-chrome";
import { readStoredBriefById } from "@/integrations/brief-store";

type PageProps = {
  params: Promise<{ id: string }>;
};

function safeFilename(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "") || "brief";
}

export default async function LibraryDetailPage({ params }: PageProps) {
  const { id } = await params;
  const brief = await readStoredBriefById(id);
  if (!brief) notFound();

  const evidence = brief.evidence_json ?? {};

  return (
    <main>
      <SiteNav />
      <article className="brief-detail">
        <p className="kicker">Stored brief</p>
        <h1>{brief.title}</h1>
        <p className="intro">
          {brief.repository_key} · {brief.analysis_mode ?? "build"} ·{" "}
          {brief.analysis_depth ?? "fast"} ·{" "}
          {new Date(brief.created_at).toLocaleDateString()} · {brief.view_count} views
        </p>
        <BriefActions
          brief={brief.brief_markdown}
          evidence={evidence}
          filename={safeFilename(brief.repository_key)}
        />
        <section className="detail-evidence">
          <span>{evidence.filesRead ?? 0} files read</span>
          <span>{evidence.treeEntries ?? 0} tree entries</span>
          <span>{evidence.estimatedTokens ?? 0} est. tokens</span>
        </section>
        <pre>{brief.brief_markdown}</pre>
      </article>
      <SiteFooter />
    </main>
  );
}
