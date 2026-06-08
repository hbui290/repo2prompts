type EvidenceFile = {
  path: string;
  size?: number;
  reason?: string;
  estimatedTokens?: number;
};

type EvidenceMapProps = {
  selectedFiles?: EvidenceFile[];
  skippedFiles?: EvidenceFile[];
  largestFiles?: EvidenceFile[];
  filesRead?: number;
  treeEntries?: number;
  estimatedTokens?: number;
};

function EvidenceColumn({ title, files, empty }: { title: string; files: EvidenceFile[]; empty: string }) {
  return (
    <article>
      <h3>{title}</h3>
      {files.length ? (
        <ul>
          {files.slice(0, 5).map((file) => (
            <li key={`${title}-${file.path}-${file.reason ?? ""}`}>
              <span>{file.path}</span>
              <small>
                {file.reason ?? "evidence"}
                {file.estimatedTokens ? ` · ${file.estimatedTokens} tokens` : ""}
              </small>
            </li>
          ))}
        </ul>
      ) : (
        <p>{empty}</p>
      )}
    </article>
  );
}

export function EvidenceMap({
  selectedFiles = [],
  skippedFiles = [],
  largestFiles = [],
  filesRead,
  treeEntries,
  estimatedTokens,
}: EvidenceMapProps) {
  const hasEvidence = selectedFiles.length || skippedFiles.length || largestFiles.length;
  return (
    <section className="evidence-map">
      <div className="evidence-map-header">
        <div>
          <p className="kicker">Evidence map</p>
          <h2>{hasEvidence ? "What the report used" : "What evidence means"}</h2>
        </div>
        <div className="evidence-stats">
          <span>{filesRead ?? 0} files</span>
          <span>{treeEntries ?? 0} tree entries</span>
          <span>{estimatedTokens ?? 0} tokens</span>
        </div>
      </div>
      <div className="evidence-map-grid">
        <EvidenceColumn title="Selected" files={selectedFiles} empty="Useful files will appear here after generation." />
        <EvidenceColumn title="Skipped" files={skippedFiles} empty="No skipped files recorded yet." />
        <EvidenceColumn title="Largest" files={largestFiles} empty="Largest files and token-heavy context are tracked here." />
      </div>
    </section>
  );
}
