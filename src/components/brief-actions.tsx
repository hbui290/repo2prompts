"use client";

type BriefActionsProps = {
  brief: string;
  filename: string;
  evidence?: unknown;
};

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function BriefActions({ brief, filename, evidence }: BriefActionsProps) {
  return (
    <div className="action-row">
      <button type="button" onClick={() => navigator.clipboard.writeText(brief)}>
        Copy brief
      </button>
      <button
        type="button"
        onClick={() => download(`${filename}.md`, brief, "text/markdown")}
      >
        Download Markdown
      </button>
      <button
        type="button"
        onClick={() =>
          download(
            `${filename}-evidence.json`,
            JSON.stringify(evidence ?? {}, null, 2),
            "application/json",
          )
        }
      >
        Export evidence JSON
      </button>
    </div>
  );
}
