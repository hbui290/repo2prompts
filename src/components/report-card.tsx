import Link from "next/link";

type ReportCardProps = {
  href: string;
  repository: string;
  title: string;
  summary: string;
  mode?: string;
  depth?: string;
  score?: number;
  safety?: string;
  createdAt?: string;
  views?: number;
  cta?: string;
};

export function briefTakeaway(markdown: string, maxLength = 180): string {
  return markdown
    .replace(/^#+\s+/gmu, "")
    .replace(/\[([^\]]+)\]/gu, "$1")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, maxLength);
}

export function ReportCard({
  href,
  repository,
  title,
  summary,
  mode,
  depth,
  score,
  safety,
  createdAt,
  views,
  cta = "Open report",
}: ReportCardProps) {
  return (
    <article className="report-card">
      <span>{repository}</span>
      <h3>
        <Link href={href}>{title}</Link>
      </h3>
      <p>{summary}</p>
      <div className="badge-row">
        {mode || depth ? <span>{mode ?? "build"} · {depth ?? "fast"}</span> : null}
        {typeof score === "number" ? <span>AI Ready {score}</span> : null}
        {safety ? <span>Safety {safety}</span> : null}
      </div>
      {createdAt || typeof views === "number" ? (
        <small>
          {createdAt ? new Date(createdAt).toLocaleDateString() : null}
          {createdAt && typeof views === "number" ? " · " : null}
          {typeof views === "number" ? `${views} views` : null}
        </small>
      ) : null}
      <Link className="card-link" href={href}>{cta}</Link>
    </article>
  );
}
