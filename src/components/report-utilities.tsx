"use client";

import { useState } from "react";
import { buildBriefExport } from "@/domain/brief-export";
import type { ReportArtifact } from "@/domain/report-artifact";
import type { StoredEvidence } from "@/integrations/brief-store";

type ReportUtilitiesProps = {
  brief: string;
  filename: string;
  repository: string;
  mode?: string;
  depth?: string;
  evidence?: StoredEvidence;
  shareUrl?: string;
  primaryAction: ReportArtifact["primaryAction"];
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

function exportInput(props: ReportUtilitiesProps) {
  return {
    repository: props.repository,
    mode: props.mode,
    depth: props.depth,
    brief: props.brief,
    evidence: props.evidence,
  };
}

export function ReportUtilities(props: ReportUtilitiesProps) {
  const [copyFallbackText, setCopyFallbackText] = useState<string | null>(null);

  async function handleCopy(text: string) {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API not available");
      }
      await navigator.clipboard.writeText(text);
    } catch {
      setCopyFallbackText(text);
    }
  }

  return (
    <div className="report-utilities">
      <button
        className="primary"
        type="button"
        onClick={() => handleCopy(props.primaryAction.copyText)}
      >
        {props.primaryAction.label}
      </button>
      <details>
        <summary>Export</summary>
        <div>
          <button type="button" onClick={() => handleCopy(buildBriefExport(exportInput(props), "markdown"))}>
            Copy Markdown
          </button>
          <button type="button" onClick={() => handleCopy(buildBriefExport(exportInput(props), "codex"))}>
            Copy Codex
          </button>
          <button type="button" onClick={() => handleCopy(buildBriefExport(exportInput(props), "cursor"))}>
            Copy Cursor
          </button>
          <button type="button" onClick={() => handleCopy(buildBriefExport(exportInput(props), "claude"))}>
            Copy Claude
          </button>
          <button type="button" onClick={() => handleCopy(buildBriefExport(exportInput(props), "evidence-json"))}>
            Copy evidence JSON
          </button>
          <button
            type="button"
            onClick={() => download(`${props.filename}.md`, props.brief, "text/markdown")}
          >
            Download markdown
          </button>
          <button
            type="button"
            onClick={() =>
              download(
                `${props.filename}-evidence.json`,
                buildBriefExport(exportInput(props), "evidence-json"),
                "application/json",
              )
            }
          >
            Export evidence JSON
          </button>
          <button
            type="button"
            onClick={() => handleCopy(props.shareUrl ?? window.location.href)}
          >
            Copy share link
          </button>
        </div>
      </details>

      {copyFallbackText && (
        <div
          className="copy-fallback-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px"
          }}
          onClick={() => setCopyFallbackText(null)}
        >
          <div
            className="copy-fallback-modal"
            style={{
              backgroundColor: "#11111b",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "600px",
              width: "100%",
              border: "1px solid #313244",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              textAlign: "left"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 12px 0", color: "#f5c2e7" }}>Clipboard Access Blocked</h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#a6adc8" }}>
              Your browser blocked automatic clipboard access (likely due to insecure HTTP context or VM access). Please copy the content manually from the box below:
            </p>
            <textarea
              value={copyFallbackText}
              readOnly
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              rows={12}
              style={{
                width: "100%",
                fontFamily: "monospace",
                fontSize: "12px",
                padding: "12px",
                margin: "0 0 16px 0",
                backgroundColor: "#1e1e2e",
                color: "#cdd6f4",
                border: "1px solid #45475a",
                borderRadius: "6px",
                resize: "vertical"
              }}
            />
            <button
              type="button"
              onClick={() => setCopyFallbackText(null)}
              style={{
                padding: "8px 16px",
                backgroundColor: "#313244",
                color: "#cdd6f4",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

