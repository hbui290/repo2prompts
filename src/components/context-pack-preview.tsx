"use client";

import { useState } from "react";
import { buildContextPackExport, type ContextPack } from "@/domain/context-pack";

type ContextPackPreviewProps = {
  contextPack: ContextPack | null;
  loading: boolean;
  error?: string | null;
  reportLoading: boolean;
  onGenerateReport: () => void;
  selectedPaths: Set<string>;
  onTogglePath: (path: string) => void;
  onTogglePathsBatch: (paths: string[], check: boolean) => void;
};

type UnifiedFile = {
  path: string;
  name: string;
  size: number;
  reason?: string;
  estimatedTokens?: number;
  isSelected: boolean;
  isAutoSelected: boolean;
};

type GroupedFolder = {
  name: string;
  files: UnifiedFile[];
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

// Group flat file lists from context pack into directory structures
function groupFilesByDirectory(
  selected: ContextPack["selectedFiles"],
  skipped: ContextPack["skippedFiles"],
  selectedPaths: Set<string>
): GroupedFolder[] {
  const folders = new Map<string, UnifiedFile[]>();

  const getDir = (path: string) => {
    const parts = path.split("/");
    if (parts.length === 1) return ". (root)";
    return parts.slice(0, -1).join("/");
  };

  // Add all selected files
  for (const f of selected) {
    const dir = getDir(f.path);
    if (!folders.has(dir)) folders.set(dir, []);
    folders.get(dir)!.push({
      path: f.path,
      name: f.path.split("/").pop() || f.path,
      size: f.size,
      reason: f.reason,
      estimatedTokens: f.estimatedTokens,
      isSelected: selectedPaths.has(f.path),
      isAutoSelected: true,
    });
  }

  // Add all skipped files
  for (const f of skipped) {
    const dir = getDir(f.path);
    if (!folders.has(dir)) folders.set(dir, []);
    if (folders.get(dir)!.some((item) => item.path === f.path)) continue;
    folders.get(dir)!.push({
      path: f.path,
      name: f.path.split("/").pop() || f.path,
      size: f.size,
      reason: f.reason,
      isSelected: selectedPaths.has(f.path),
      isAutoSelected: false,
    });
  }

  // Sort directories and file arrays alphabetically
  return Array.from(folders.entries())
    .map(([name, files]) => ({
      name,
      files: files.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Visual color coding for selection reasons/rules
function getReasonColor(reason: string): { bg: string; text: string } {
  const lower = reason.toLowerCase();
  if (lower.includes("secret")) return { bg: "rgba(243, 139, 168, 0.15)", text: "#f38ba8" }; // Red
  if (lower.includes("large")) return { bg: "rgba(250, 179, 135, 0.15)", text: "#fab387" }; // Orange
  if (lower.includes("low")) return { bg: "rgba(147, 153, 178, 0.12)", text: "#a6adc8" }; // Gray
  if (lower.includes("custom")) return { bg: "rgba(203, 166, 247, 0.15)", text: "#cba6f7" }; // Purple
  if (lower.includes("entrypoint")) return { bg: "rgba(166, 227, 161, 0.15)", text: "#a6e3a1" }; // Green
  if (lower.includes("route")) return { bg: "rgba(137, 180, 250, 0.15)", text: "#89b4fa" }; // Blue
  return { bg: "rgba(116, 199, 236, 0.12)", text: "#74c7ec" }; // default Cyan
}

export function ContextPackPreview({
  contextPack,
  loading,
  error,
  reportLoading,
  onGenerateReport,
  selectedPaths,
  onTogglePath,
  onTogglePathsBatch,
}: ContextPackPreviewProps) {
  const [copyFallbackText, setCopyFallbackText] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([". (root)"]));

  // Compile a clean flat list of all candidate files inside the context pack
  const allFilesList = contextPack
    ? [
        ...contextPack.selectedFiles.map((f) => ({
          path: f.path,
          size: f.size,
          reason: f.reason,
          estimatedTokens: f.estimatedTokens,
          isSelected: selectedPaths.has(f.path)
        })),
        ...contextPack.skippedFiles
          .filter((f) => !contextPack.selectedFiles.some((sf) => sf.path === f.path))
          .map((f) => ({
            path: f.path,
            size: f.size ?? 0,
            reason: f.reason ?? "skipped",
            estimatedTokens: Math.ceil((f.size ?? 0) / 4),
            isSelected: selectedPaths.has(f.path)
          })),
      ]
    : [];

  // Extension parsing and Quick Filters counts
  const extensions = Array.from(
    new Set(
      allFilesList.map((f) => {
        const ext = f.path.split(".").pop();
        return ext && ext !== f.path ? `.${ext}` : "no extension";
      })
    )
  ).sort();

  const extensionCounts = allFilesList.reduce((acc, f) => {
    const ext = f.path.split(".").pop();
    const key = ext && ext !== f.path ? `.${ext}` : "no extension";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Compute selection stats dynamically
  const selectedFilesFromPack = contextPack
    ? contextPack.selectedFiles.filter((f) => selectedPaths.has(f.path))
    : [];
  const customSelectedFilesFromSkipped = contextPack
    ? contextPack.skippedFiles
        .filter((f) => selectedPaths.has(f.path))
        .map((f) => ({
          path: f.path,
          size: f.size ?? 0,
          score: 1.0,
          reason: "custom_inclusion",
          estimatedTokens: Math.ceil((f.size ?? 0) / 4),
        }))
    : [];
  const allSelectedFiles = [...selectedFilesFromPack, ...customSelectedFilesFromSkipped];

  const allSkippedFiles = contextPack
    ? [
        ...contextPack.skippedFiles.filter((f) => !selectedPaths.has(f.path)),
        ...contextPack.selectedFiles.filter((f) => !selectedPaths.has(f.path)),
      ]
    : [];

  const totalTokens = allSelectedFiles.reduce((sum, f) => sum + (f.estimatedTokens ?? 0), 0);

  // Customized ContextPack for export files
  const customizedPack: ContextPack | null = contextPack
    ? {
        ...contextPack,
        selectedFiles: allSelectedFiles,
        skippedFiles: allSkippedFiles.map((f) => ({ path: f.path, size: f.size ?? 0, reason: f.reason ?? "excluded" })),
        stats: {
          ...contextPack.stats,
          selectedFiles: allSelectedFiles.length,
          skippedFiles: allSkippedFiles.length,
          estimatedTokens: totalTokens,
        },
      }
    : null;

  const markdown = customizedPack ? buildContextPackExport(customizedPack, "markdown") : "";
  const json = customizedPack ? buildContextPackExport(customizedPack, "json") : "";

  async function copyContextPack() {
    if (!markdown) return;
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API not available");
      }
      await navigator.clipboard.writeText(markdown);
    } catch {
      setCopyFallbackText(markdown);
    }
  }

  function toggleFolderCollapse(folderName: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderName)) {
        next.delete(folderName);
      } else {
        next.add(folderName);
      }
      return next;
    });
  }

  function toggleFolderFiles(folderFiles: UnifiedFile[]) {
    const filePaths = folderFiles.map((f) => f.path);
    const allChecked = folderFiles.every((f) => selectedPaths.has(f.path));
    onTogglePathsBatch(filePaths, !allChecked);
  }

  // Get grouped folder items matching current search query
  const groupedFolders = contextPack
    ? groupFilesByDirectory(contextPack.selectedFiles, contextPack.skippedFiles, selectedPaths)
    : [];

  const filteredFolders = groupedFolders
    .map((folder) => {
      const files = folder.files.filter((f) =>
        f.path.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return { ...folder, files };
    })
    .filter((folder) => folder.files.length > 0);

  return (
    <section className="context-pack-preview" aria-live="polite" style={{ marginTop: "24px" }}>
      <div className="context-pack-header" style={{ marginBottom: "16px" }}>
        <div>
          <p className="kicker">Context pack</p>
          <h2>{contextPack ? "Evidence selected before the report." : "Build context before generating."}</h2>
        </div>
        <span>{loading ? "Scanning repo" : contextPack ? "Ready" : "Standby"}</span>
      </div>

      {error ? <p className="context-pack-error">{error}</p> : null}

      {contextPack ? (
        <div style={{ display: "flex", gap: "24px", flexDirection: "row", flexWrap: "wrap", width: "100%", maxWidth: "100%", minWidth: 0 }}>
          
          {/* Left Panel: Filter & Collapsible Directory selector */}
          <div style={{ flex: "2", minWidth: "320px", maxWidth: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* Search filter input */}
            <input
              type="text"
              placeholder="Search files by path... (e.g. src/domain)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px",
                backgroundColor: "#11111b",
                color: "#cdd6f4",
                border: "1px solid #313244",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box"
              }}
            />

            {/* Extension quick filter toggles */}
            <div style={{ backgroundColor: "#1e1e2e", border: "1px solid #313244", borderRadius: "12px", padding: "16px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#a6adc8", display: "block", marginBottom: "10px" }}>QUICK FILTERS (BY FILE TYPE)</span>
              <div className="custom-scrollbar" style={{ display: "flex", gap: "8px", flexWrap: "wrap", maxHeight: "120px", overflowY: "auto", paddingRight: "4px" }}>
                {extensions.map((ext) => {
                  const count = extensionCounts[ext] || 0;
                  const filesOfExt = allFilesList.filter((f) => {
                    const fileExt = f.path.split(".").pop();
                    const key = fileExt && fileExt !== f.path ? `.${fileExt}` : "no extension";
                    return key === ext;
                  });
                  const allChecked = filesOfExt.every((f) => selectedPaths.has(f.path));
                  const someChecked = filesOfExt.some((f) => selectedPaths.has(f.path)) && !allChecked;

                  return (
                    <label
                      key={ext}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        backgroundColor: allChecked ? "rgba(137, 180, 250, 0.15)" : "#11111b",
                        border: allChecked ? "1px solid #89b4fa" : "1px solid #313244",
                        borderRadius: "20px",
                        fontSize: "12px",
                        color: allChecked ? "#89b4fa" : "#cdd6f4",
                        cursor: "pointer",
                        userSelect: "none"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={(el) => {
                          if (el) el.indeterminate = someChecked;
                        }}
                        onChange={(e) => {
                          const paths = filesOfExt.map((f) => f.path);
                          onTogglePathsBatch(paths, e.target.checked);
                        }}
                        style={{ cursor: "pointer", width: "16px", height: "16px", flexShrink: 0 }}
                      />
                      <span>{ext} <small style={{ opacity: 0.7 }}>({count})</small></span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Folder Directory Selector list */}
            <div style={{ backgroundColor: "#1e1e2e", border: "1px solid #313244", borderRadius: "12px", padding: "20px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#a6adc8", display: "block", marginBottom: "12px" }}>REPOSITORY FILE TREE</span>
              
              {filteredFolders.length ? (
                <div className="custom-scrollbar" style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "400px", overflowY: "auto", paddingRight: "8px" }}>
                  {filteredFolders.map((folder) => {
                    const isCollapsed = searchQuery.trim() !== "" ? false : !expandedFolders.has(folder.name);
                    const selectedCount = folder.files.filter((f) => selectedPaths.has(f.path)).length;
                    const folderAllChecked = folder.files.every((f) => selectedPaths.has(f.path));
                    const folderSomeChecked = folder.files.some((f) => selectedPaths.has(f.path)) && !folderAllChecked;

                    return (
                      <div key={folder.name} style={{ border: "1px solid #313244", borderRadius: "8px", overflow: "hidden", backgroundColor: "#11111b", flexShrink: 0 }}>
                        {/* Folder Header Row */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "10px 14px",
                            backgroundColor: "#181825",
                            cursor: "pointer",
                            userSelect: "none",
                            borderBottom: isCollapsed ? "none" : "1px solid #313244"
                          }}
                          onClick={() => toggleFolderCollapse(folder.name)}
                        >
                          <span
                            style={{
                              transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                              transition: "transform 0.15s ease",
                              color: "#a6adc8",
                              fontSize: "10px"
                            }}
                          >
                            ▼
                          </span>
                          <input
                            type="checkbox"
                            checked={folderAllChecked}
                            ref={(el) => {
                              if (el) el.indeterminate = folderSomeChecked;
                            }}
                            onClick={(e) => e.stopPropagation()} // Prevent toggling expand on checkbox click
                            onChange={() => toggleFolderFiles(folder.files)}
                            style={{ cursor: "pointer", width: "16px", height: "16px", flexShrink: 0 }}
                          />
                          <span style={{ fontWeight: "600", fontSize: "14px", color: "#cdd6f4", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            📁 {folder.name}
                          </span>
                          <small style={{ color: "#a6adc8", fontSize: "12px" }}>
                            {selectedCount}/{folder.files.length} selected
                          </small>
                        </div>

                        {/* Folder Files List */}
                        {!isCollapsed && (
                          <ul style={{ listStyle: "none", margin: 0, padding: "8px 14px" }}>
                            {folder.files.map((file) => {
                              const isChecked = selectedPaths.has(file.path);
                              const reasonColor = getReasonColor(file.reason ?? "");

                              return (
                                <li
                                  key={file.path}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    padding: "6px 0",
                                    borderBottom: "1px solid rgba(49, 50, 68, 0.4)"
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => onTogglePath(file.path)}
                                    style={{ cursor: "pointer", width: "16px", height: "16px", flexShrink: 0 }}
                                  />
                                  <span
                                    style={{
                                      fontSize: "14px",
                                      color: isChecked ? "#cdd6f4" : "#585b70",
                                      fontWeight: isChecked ? "500" : "normal",
                                      textDecoration: isChecked ? "none" : "line-through",
                                      flex: 1,
                                      wordBreak: "break-all"
                                    }}
                                  >
                                    {file.name}
                                  </span>
                                  {file.reason && (
                                    <span
                                      style={{
                                        fontSize: "10px",
                                        fontWeight: "600",
                                        padding: "2px 6px",
                                        borderRadius: "4px",
                                        backgroundColor: reasonColor.bg,
                                        color: reasonColor.text
                                      }}
                                    >
                                      {file.reason}
                                    </span>
                                  )}
                                  <small style={{ fontSize: "11px", color: "#7f849c", minWidth: "60px", textAlign: "right" }}>
                                    {file.estimatedTokens ? `${file.estimatedTokens} tk` : `${file.size} B`}
                                  </small>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: "#7f849c", fontSize: "14px", margin: "10px 0" }}>No files match the search criteria.</p>
              )}
            </div>
          </div>

          {/* Right Panel: Stats, Actions, and Largest Files */}
          <div style={{ flex: "1", minWidth: "250px", maxWidth: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* Dynamic Stats Box */}
            <div style={{ backgroundColor: "#1e1e2e", border: "1px solid #313244", borderRadius: "12px", padding: "20px" }}>
              <h3 style={{ margin: "0 0 12px 0", color: "#cdd6f4", fontSize: "16px" }}>Selection Stats</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                  <span style={{ color: "#a6adc8" }}>Files read:</span>
                  <strong style={{ color: "#cdd6f4" }}>{contextPack.stats.filesRead}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                  <span style={{ color: "#a6adc8" }}>Selected:</span>
                  <strong style={{ color: "#cba6f7" }}>{allSelectedFiles.length}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                  <span style={{ color: "#a6adc8" }}>Skipped:</span>
                  <strong style={{ color: "#f38ba8" }}>{allSkippedFiles.length}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", borderTop: "1px solid #313244", paddingTop: "8px", marginTop: "4px" }}>
                  <span style={{ color: "#a6adc8" }}>Estimated tokens:</span>
                  <strong style={{ color: "#a6e3a1" }}>{totalTokens}</strong>
                </div>
              </div>
            </div>

            {/* Actions list */}
            <div style={{ backgroundColor: "#1e1e2e", border: "1px solid #313244", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <button
                type="button"
                onClick={onGenerateReport}
                disabled={reportLoading}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "linear-gradient(135deg, #89b4fa, #b4befe)",
                  color: "#11111b",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(137, 180, 250, 0.2)"
                }}
              >
                {reportLoading ? "Generating report..." : "Generate report"}
              </button>

              <button
                type="button"
                onClick={copyContextPack}
                style={{
                  width: "100%",
                  padding: "10px",
                  backgroundColor: "transparent",
                  color: "#cdd6f4",
                  border: "1px solid #313244",
                  borderRadius: "8px",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                Copy context pack
              </button>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => download("repo2prompts-context-pack.md", markdown, "text/markdown")}
                  style={{ flex: 1, padding: "8px", fontSize: "12px", backgroundColor: "#313244", color: "#cdd6f4", border: "none", borderRadius: "6px", cursor: "pointer" }}
                >
                  Download MD
                </button>
                <button
                  type="button"
                  onClick={() => download("repo2prompts-context-pack.json", json, "application/json")}
                  style={{ flex: 1, padding: "8px", fontSize: "12px", backgroundColor: "#313244", color: "#cdd6f4", border: "none", borderRadius: "6px", cursor: "pointer" }}
                >
                  Download JSON
                </button>
              </div>
            </div>

            {/* Safety warnings list */}
            {contextPack.safetyWarnings.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {contextPack.safetyWarnings.map((warning) => (
                  <div key={warning} style={{ backgroundColor: "rgba(250, 179, 135, 0.1)", border: "1px solid #fab387", color: "#fab387", borderRadius: "8px", padding: "10px 14px", fontSize: "12px" }}>
                    ⚠️ {warning}
                  </div>
                ))}
              </div>
            ) : null}

            {/* Largest Files reference (Read-Only) */}
            <div style={{ backgroundColor: "#1e1e2e", border: "1px solid #313244", borderRadius: "12px", padding: "20px" }}>
              <h3 style={{ margin: "0 0 10px 0", color: "#cdd6f4", fontSize: "14px", fontWeight: "600" }}>Largest Files (Token Heavy)</h3>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                {contextPack.largestFiles.slice(0, 5).map((file) => (
                  <li key={file.path} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", borderBottom: "1px solid rgba(49, 50, 68, 0.4)", paddingBottom: "4px" }}>
                    <span style={{ color: "#a6adc8", wordBreak: "break-all", marginRight: "8px" }} title={file.path}>
                      {file.path.split("/").pop()}
                    </span>
                    <strong style={{ color: "#fab387", whiteSpace: "nowrap" }}>
                      {file.estimatedTokens ? `${file.estimatedTokens} tk` : `${file.size} B`}
                    </strong>
                  </li>
                ))}
              </ul>
            </div>
            
          </div>
        </div>
      ) : (
        <p className="context-pack-standby">
          This step reads the repo, chooses useful files, skips noisy paths, and estimates token cost before any agent report is generated.
        </p>
      )}

      {/* Copy Fallback Dialog Modal */}
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
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
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
    </section>
  );
}
