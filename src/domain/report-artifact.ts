import type { AgentReadinessReport } from "@/domain/agent-readiness";
import type { StoredBrief, StoredEvidence } from "@/integrations/brief-store";

type EvidenceFile = NonNullable<StoredEvidence["selectedFiles"]>[number];
type ReportBriefLike = Pick<
  StoredBrief,
  "repository_key" | "analysis_mode" | "analysis_depth" | "brief_markdown" | "evidence_json"
>;

export type ReportArtifactSection = {
  title: string;
  items: string[];
  tone?: "default" | "prompt" | "warning";
};

export type ReportArtifact = {
  verdict: { title: string; detail: string; tone: "limited" | "usable" | "strong" };
  primaryAction: { label: string; detail: string; bullets: string[]; copyText: string };
  confirmed: string[];
  inferred: string[];
  unknown: string[];
  modeSections: ReportArtifactSection[];
  qualitySnapshot: {
    scoreLabel: string;
    evidenceCoverage: string;
    implementationConfidence: string;
    verificationClarity: string;
    riskSignal: string;
    technicalDetails: string[];
  };
  evidenceGroups: {
    selected: EvidenceFile[];
    skipped: NonNullable<StoredEvidence["skippedFiles"]>;
    largest: NonNullable<StoredEvidence["largestFiles"]>;
    reasons: Array<{ reason: string; paths: string[] }>;
  };
};

const MODE_TITLES: Record<string, string[]> = {
  build: [
    "What this repo appears to do",
    "Implementation signals",
    "Suggested build order",
    "Risks / missing clarity",
    "Verification checklist",
  ],
  review: [
    "Top findings",
    "Risk areas",
    "Missing checks",
    "Evidence references",
    "Suggested next review steps",
  ],
  prompt: [
    "Copyable agent handoff",
    "Constraints",
    "Confirmed facts",
    "Missing information",
    "Evidence summary",
  ],
  debug: [
    "Likely failure points",
    "Symptoms / suspected causes",
    "Checks to run",
    "Suggested fixes",
    "Confidence notes",
  ],
  migration: [
    "Current state",
    "Migration target",
    "Risky edges",
    "Migration sequence",
    "Validation / rollback guidance",
  ],
};

const SECTION_HINTS: Record<string, string[]> = {
  "What this repo appears to do": ["Product purpose", "What this repo appears", "User-visible capabilities"],
  "Implementation signals": ["Architecture and data flow", "External integrations", "Observed evidence"],
  "Suggested build order": ["Implementation sequence", "Suggested build order", "Implementation path"],
  "Risks / missing clarity": ["Risks", "Inferences and unknowns", "Unknowns"],
  "Verification checklist": ["Verification plan", "Checks", "Verification"],
  "Top findings": ["Top findings", "Findings", "Observed evidence"],
  "Risk areas": ["Risks", "Risk areas", "Inferences and unknowns"],
  "Missing checks": ["Missing checks", "Verification plan", "Unknowns"],
  "Evidence references": ["Evidence references", "Observed evidence", "Selected evidence"],
  "Suggested next review steps": ["Suggested next review steps", "Implementation sequence", "Verification plan"],
  "Copyable agent handoff": ["Copyable prompt", "Agent handoff", "Brief"],
  "Constraints": ["Constraints", "Rules", "Inferences and unknowns"],
  "Confirmed facts": ["Observed evidence", "Confirmed", "Product purpose"],
  "Missing information": ["Unknowns", "Missing information", "Inferences and unknowns"],
  "Evidence summary": ["Observed evidence", "Evidence summary", "Selected evidence"],
  "Likely failure points": ["Likely failure", "Risks"],
  "Symptoms / suspected causes": ["Symptoms", "Architecture and data flow", "Observed evidence"],
  "Checks to run": ["Verification plan", "Checks", "Verification"],
  "Suggested fixes": ["Minimal fixes", "Suggested fixes", "Fixes"],
  "Confidence notes": ["Inferences and unknowns", "Confidence", "Unknowns"],
  "Current state": ["Product purpose", "Architecture and data flow", "Observed evidence"],
  "Migration target": ["Migration target", "Suggested build order", "Implementation sequence"],
  "Risky edges": ["Risky edges", "Risks", "Inferences and unknowns"],
  "Migration sequence": ["Migration sequence", "Implementation sequence", "Suggested build order"],
  "Validation / rollback guidance": ["Verification plan", "Rollback", "Validation"],
};

function clean(value: string): string {
  return value
    .replace(/\s+/gu, " ")
    .replace(/^[-*]\s+/u, "")
    .trim();
}

function short(value: string, limit = 118): string {
  const normalized = clean(value);
  return normalized.length > limit ? `${normalized.slice(0, limit - 1).trim()}…` : normalized;
}

function unique(values: string[], limit: number): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values.map((item) => short(item)).filter(Boolean)) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(value);
    if (output.length >= limit) break;
  }
  return output;
}

function pathIncludes(files: EvidenceFile[], pattern: RegExp): boolean {
  return files.some((file) => pattern.test(file.path.toLowerCase()));
}

function extractMarkdownLines(markdown: string): string[] {
  return markdown
    .split(/\r?\n/u)
    .map(clean)
    .filter((line) => line && !/^#+\s*$/u.test(line))
    .filter((line) => !/^#+\s+/u.test(line));
}

function sectionItems(markdown: string, title: string): string[] {
  const lines = markdown.split(/\r?\n/u);
  const items: string[] = [];
  let collecting = false;
  const hints = SECTION_HINTS[title] ?? [title];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^#+\s+/u.test(trimmed)) {
      const heading = trimmed.replace(/^#+\s+/u, "").toLowerCase();
      collecting = hints.some((hint) => heading.includes(hint.toLowerCase()));
      continue;
    }
    if (collecting && trimmed) items.push(trimmed);
    if (items.length >= 4) break;
  }

  return unique(items, 4);
}

function markdownSection(markdown: string, hints: string[]): string[] {
  const lines = markdown.split(/\r?\n/u);
  const items: string[] = [];
  let collecting = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^#+\s+/u.test(trimmed)) {
      const heading = trimmed.replace(/^#+\s+/u, "").toLowerCase();
      collecting = hints.some((hint) => heading.includes(hint.toLowerCase()));
      continue;
    }
    if (collecting && trimmed) items.push(trimmed);
  }

  return unique(items, 8);
}

function fallbackItems(markdown: string, offset: number): string[] {
  const lines = extractMarkdownLines(markdown);
  return unique(lines.slice(offset, offset + 4), 4);
}

function evidenceReasons(selected: EvidenceFile[]): Array<{ reason: string; paths: string[] }> {
  const groups = new Map<string, string[]>();
  for (const file of selected) {
    const reason = clean(file.reason ?? "selected");
    const paths = groups.get(reason) ?? [];
    paths.push(file.path);
    groups.set(reason, paths);
  }
  return [...groups.entries()].map(([reason, paths]) => ({ reason, paths: paths.slice(0, 6) }));
}

function mergeItems(primary: string[], fallback: string[], limit: number): string[] {
  return unique([...primary, ...fallback], limit);
}

function isWeakSection(items: string[], minimum = 2): boolean {
  return items.length < minimum;
}

function verdictFor(input: { mode: string; readiness?: AgentReadinessReport; filesRead: number; selectedCount: number }): ReportArtifact["verdict"] {
  const score = input.readiness?.score;
  const sparse = input.filesRead <= 1 || input.selectedCount <= 1;
  if (sparse || (typeof score === "number" && score < 60)) {
    return {
      title: "Limited evidence. Useful for orientation, not implementation yet.",
      detail: "Treat this report as a starting point and verify the repository manually before assigning code changes.",
      tone: "limited",
    };
  }
  if (input.mode === "review") {
    return {
      title: "Review-ready summary, but manual verification is still needed.",
      detail: "Use the findings as a review checklist, then confirm each item against source files.",
      tone: "usable",
    };
  }
  if (typeof score === "number" && score >= 80) {
    return {
      title: "Good implementation starting point with clear supporting evidence.",
      detail: "The report has enough selected evidence to brief a coding agent with fewer guesses.",
      tone: "strong",
    };
  }
  return {
    title: "Useful starting point, but manual verification is still needed.",
    detail: "The report has helpful evidence, but some setup, tests, or architecture details may still be missing.",
    tone: "usable",
  };
}

function primaryAction(mode: string, readiness: AgentReadinessReport | undefined, markdown: string): ReportArtifact["primaryAction"] {
  const actions: Record<string, { label: string; detail: string }> = {
    build: { label: "Copy implementation brief", detail: "Give the agent the brief, then ask it to work only from cited evidence." },
    review: { label: "Copy review checklist", detail: "Give the agent the review checklist, then verify each finding against selected files." },
    prompt: { label: "Copy agent handoff", detail: "Use the handoff as the first message for your coding agent." },
    debug: { label: "Copy debugging checklist", detail: "Give the agent the debugging checklist so it can inspect logs, commands, and code paths in order." },
    migration: { label: "Copy migration plan", detail: "Give the agent the migration plan after validating risky edges and rollback guidance." },
  };
  const selected = actions[mode] ?? actions.build;
  return {
    ...selected,
    bullets: unique([
      readiness?.bestNextPrompt ? "Use the best next prompt as the first agent instruction." : "Copy the report into your agent workspace.",
      "Verify cited files before making changes.",
      "Do not refactor unrelated files unless the report explicitly supports it.",
      ...(readiness?.verificationCommands?.length ? [`Run: ${readiness.verificationCommands[0]}`] : []),
    ], 4),
    copyText: readiness?.bestNextPrompt ?? markdown,
  };
}

function truthTable(input: {
  brief: ReportBriefLike;
  selected: EvidenceFile[];
  readiness?: AgentReadinessReport;
}): Pick<ReportArtifact, "confirmed" | "inferred" | "unknown"> {
  const evidence = input.brief.evidence_json ?? {};
  const selected = input.selected;
  const quality = evidence.analysis?.quality;
  const confirmed = unique([
    `${input.brief.repository_key} was analyzed in ${input.brief.analysis_mode ?? "build"} mode.`,
    typeof evidence.filesRead === "number" ? `${evidence.filesRead} files were read for evidence.` : "",
    pathIncludes(selected, /(^|\/)readme(\.md)?$/u) ? "README evidence is available." : "",
    pathIncludes(selected, /(^|\/)package\.json$/u) ? "A package manifest was selected." : "",
    pathIncludes(selected, /test|spec|__tests__/u) ? "Test evidence was selected." : "",
    pathIncludes(selected, /(^|\/)(app|src|pages|api)\//u) ? "Application or API source files were selected." : "",
  ], 6);

  const markdownInferences = markdownSection(input.brief.brief_markdown, ["Inferences and unknowns", "Inference", "Inferences"])
    .filter((item) => /^(inference:|likely|appears|suggests|may |might |probably )/iu.test(item));
  const inferred = unique([
    ...markdownInferences,
    ...(input.readiness?.strengths ?? []).filter((item) => !/generated brief|quality check/i.test(item)),
  ], 6);

  const unknown = unique([
    !pathIncludes(selected, /(^|\/)(test|.*\.test\.|.*\.spec\.|__tests__)/u) ? "Test coverage was not clearly observed in selected evidence." : "",
    !pathIncludes(selected, /(^|\/)(\.env\.example|env\.example)$/u) ? "Required environment variables may still need manual confirmation." : "",
    !input.readiness?.verificationCommands?.length ? "No clear verification command was detected." : "",
    ...(quality?.warnings ?? []),
  ], 6);

  return {
    confirmed: confirmed.length ? confirmed : ["Repository identity and report mode are recorded."],
    inferred: inferred.length ? inferred : ["Available evidence is not enough for strong implementation inference."],
    unknown: unknown.length ? unknown : ["No major unknowns were recorded by the configured checks."],
  };
}

function suggestedImprovements(readiness?: AgentReadinessReport): string[] {
  return unique(readiness?.improvements ?? [], 6);
}

function modeSections(mode: string, markdown: string, truth: Pick<ReportArtifact, "confirmed" | "inferred" | "unknown">, readiness?: AgentReadinessReport): ReportArtifactSection[] {
  const titles = MODE_TITLES[mode] ?? MODE_TITLES.build;
  return titles.map((title, index) => {
    const direct = sectionItems(markdown, title);
    let items = direct.length ? direct : fallbackItems(markdown, index * 2);
    if (mode === "debug" && title === "Symptoms / suspected causes") {
      const symptoms = markdownSection(markdown, ["Symptoms / suspected causes", "Symptoms", "Suspected causes"]);
      items = symptoms.length ? symptoms : markdownSection(markdown, ["Likely failure areas", "Likely failure points"]);
    }
    if (mode === "debug" && title === "Checks to run") {
      items = markdownSection(markdown, ["Diagnostic steps", "Checks to run", "Verification plan", "Checks"]);
    }
    if (title === "Suggested fixes") {
      items = mergeItems([
        ...markdownSection(markdown, ["Minimal fixes", "Suggested fixes", "Fixes"]),
        ...suggestedImprovements(readiness),
      ], [], 6);
    }
    if (title.toLowerCase().includes("confirmed")) items = truth.confirmed;
    if (title === "Missing checks") {
      const missingChecks = markdownSection(markdown, ["Missing checks", "Verification gaps", "Missing verification"]);
      items = mergeItems(missingChecks, truth.unknown, 6);
    }
    if (title === "Risks / missing clarity" || title === "Risk areas" || title === "Risky edges") {
      items = isWeakSection(items) ? mergeItems(items, truth.unknown, 5) : items;
    }
    if (title === "Verification checklist" || title === "Checks to run" || title === "Validation / rollback guidance") {
      items = readiness?.verificationCommands?.length
        ? mergeItems(items, readiness.verificationCommands, 6)
        : mergeItems(items, ["Verify cited source files manually."], 6);
    }
    if (title.toLowerCase().includes("unknown") || title.toLowerCase().includes("missing information")) {
      items = mergeItems(items, truth.unknown, 5);
    }
    if (title.toLowerCase().includes("handoff")) {
      items = [readiness?.bestNextPrompt ?? markdown];
    }
    return {
      title,
      items: items.length ? items : ["No specific item recorded for this section."],
      tone: title.toLowerCase().includes("handoff") ? "prompt" : title.toLowerCase().includes("risk") ? "warning" : "default",
    };
  });
}

function qualitySnapshot(brief: ReportBriefLike, readiness: AgentReadinessReport | undefined): ReportArtifact["qualitySnapshot"] {
  const evidence = brief.evidence_json ?? {};
  const scoreLabel = typeof readiness?.score === "number" ? `${readiness.score}/100 ${readiness.label}` : "not recorded";
  const selectedCount = evidence.selectedFiles?.length ?? 0;
  const filesRead = evidence.filesRead ?? selectedCount;
  return {
    scoreLabel,
    evidenceCoverage: `${filesRead} files read, ${selectedCount} selected`,
    implementationConfidence: readiness ? `${readiness.confidence} confidence` : "confidence not recorded",
    verificationClarity: readiness?.verificationCommands?.length ? readiness.verificationCommands.join(", ") : "no clear verification command",
    riskSignal: readiness?.safety?.level ? `${readiness.safety.level} safety signal` : "risk signal not recorded",
    technicalDetails: unique([
      evidence.analysis?.pipeline ? `Pipeline: ${evidence.analysis.pipeline.replaceAll("_", " ")}` : "",
      evidence.analysis?.repositoryMapSource ? `Map: ${evidence.analysis.repositoryMapSource}` : "",
      typeof evidence.analysis?.modulesAnalyzed === "number" ? `Modules: ${evidence.analysis.modulesAnalyzed}` : "",
      evidence.analysis?.evidenceFingerprint ? `Fingerprint: ${evidence.analysis.evidenceFingerprint.slice(0, 12)}...` : "",
      evidence.analysis?.quality?.repaired ? "Quality repair was applied." : "",
    ], 5),
  };
}

export function buildReportArtifact(input: {
  brief: ReportBriefLike;
  readiness?: AgentReadinessReport;
}): ReportArtifact {
  const evidence = input.brief.evidence_json ?? {};
  const selected = evidence.selectedFiles ?? [];
  const mode = input.brief.analysis_mode ?? "build";
  const truth = truthTable({ brief: input.brief, selected, readiness: input.readiness });

  return {
    verdict: verdictFor({
      mode,
      readiness: input.readiness,
      filesRead: evidence.filesRead ?? selected.length,
      selectedCount: selected.length,
    }),
    primaryAction: primaryAction(mode, input.readiness, input.brief.brief_markdown),
    ...truth,
    modeSections: modeSections(mode, input.brief.brief_markdown, truth, input.readiness),
    qualitySnapshot: qualitySnapshot(input.brief, input.readiness),
    evidenceGroups: {
      selected,
      skipped: evidence.skippedFiles ?? [],
      largest: evidence.largestFiles ?? [],
      reasons: evidenceReasons(selected),
    },
  };
}
