const sections = [
  ["Verdict", "#report-verdict"],
  ["Truth", "#report-truth"],
  ["Report", "#report-body"],
  ["Evidence", "#report-evidence"],
  ["Quality", "#report-quality"],
];

export function ReportSectionNav() {
  return (
    <nav className="report-section-nav" aria-label="Report sections">
      {sections.map(([label, href]) => (
        <a key={href} href={href}>{label}</a>
      ))}
    </nav>
  );
}
