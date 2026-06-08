export type ReadinessBand =
  | "excellent"
  | "strong"
  | "usable"
  | "needs_work"
  | "hard_for_agents";

export type Confidence = "high" | "medium" | "low";
export type SafetyLevel = "low" | "medium" | "high" | "critical";

export type ReadinessBreakdownItem = {
  key: "documentation" | "setup" | "architecture" | "tests" | "taskability" | "risk";
  label: string;
  score: number;
  max: number;
  reasons: string[];
};

export type AgentSafetyReport = {
  level: SafetyLevel;
  warnings: string[];
  disclaimer: string;
};

export type AgentReadinessReport = {
  score: number;
  band: ReadinessBand;
  label: string;
  confidence: Confidence;
  breakdown: ReadinessBreakdownItem[];
  strengths: string[];
  improvements: string[];
  bestNextPrompt: string;
  verificationCommands: string[];
  safety: AgentSafetyReport;
};

type EvidenceFile = {
  path?: unknown;
  reason?: unknown;
  content?: unknown;
  size?: unknown;
  estimatedTokens?: unknown;
};

export type AgentReadinessInput = {
  repository?: string;
  mode?: string;
  depth?: string;
  brief?: string;
  evidence?: {
    filesRead?: number;
    treeEntries?: number;
    estimatedTokens?: number;
    selectedFiles?: EvidenceFile[];
    skippedFiles?: EvidenceFile[];
    largestFiles?: EvidenceFile[];
    analysis?: {
      quality?: { passed?: boolean; warnings?: string[]; repaired?: boolean };
    };
  };
};

const SAFETY_DISCLAIMER =
  "This report is based on selected repository evidence and configured checks. It is not a guarantee that the repository is secure or production-ready.";

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function lowerPath(file: EvidenceFile): string {
  return text(file.path).toLowerCase();
}

function content(file: EvidenceFile): string {
  return text(file.content);
}

function selected(input: AgentReadinessInput): EvidenceFile[] {
  return input.evidence?.selectedFiles ?? [];
}

function skipped(input: AgentReadinessInput): EvidenceFile[] {
  return input.evidence?.skippedFiles ?? [];
}

function largest(input: AgentReadinessInput): EvidenceFile[] {
  return input.evidence?.largestFiles ?? [];
}

function hasSelected(input: AgentReadinessInput, pattern: RegExp): boolean {
  return selected(input).some((file) => pattern.test(lowerPath(file)));
}

function hasPath(input: AgentReadinessInput, pattern: RegExp): boolean {
  return [...selected(input), ...skipped(input), ...largest(input)].some((file) => pattern.test(lowerPath(file)));
}

function qualityWarnings(input: AgentReadinessInput): string[] {
  return input.evidence?.analysis?.quality?.warnings ?? [];
}

function qualityPassed(input: AgentReadinessInput): boolean {
  return input.evidence?.analysis?.quality?.passed === true;
}

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max, value));
}

function packageManager(input: AgentReadinessInput): "pnpm" | "yarn" | "npm" {
  if (hasPath(input, /(^|\/)pnpm-lock\.ya?ml$/u)) return "pnpm";
  if (hasPath(input, /(^|\/)yarn\.lock$/u)) return "yarn";
  return "npm";
}

function packageJson(input: AgentReadinessInput): Record<string, unknown> | null {
  const file = selected(input).find((item) => /(^|\/)package\.json$/u.test(lowerPath(item)));
  if (!file) return null;
  try {
    const parsed = JSON.parse(content(file)) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function packageScripts(input: AgentReadinessInput): Record<string, unknown> {
  const scripts = packageJson(input)?.scripts;
  return scripts && typeof scripts === "object" ? scripts as Record<string, unknown> : {};
}

export function detectVerificationCommands(input: AgentReadinessInput): string[] {
  const commands: string[] = [];
  const scripts = packageScripts(input);
  const manager = packageManager(input);
  for (const script of ["test", "lint", "build"]) {
    if (typeof scripts[script] === "string") {
      commands.push(manager === "npm" && script === "test" ? "npm test" : `${manager} ${script}`);
    }
  }
  if (commands.length) return commands;
  if (hasPath(input, /(^|\/)cargo\.toml$/u)) return ["cargo test"];
  if (hasPath(input, /(^|\/)go\.mod$/u)) return ["go test ./..."];
  if (hasPath(input, /(^|\/)(pyproject\.toml|pytest\.ini)$/u)) return ["pytest"];
  if (selected(input).some((file) => /(^|\/)requirements\.txt$/u.test(lowerPath(file)) && /pytest/iu.test(content(file)))) {
    return ["pytest"];
  }
  return [];
}

function addWarning(rows: string[], warning: string) {
  if (!rows.includes(warning)) rows.push(warning);
}

export function detectSafetyWarnings(input: AgentReadinessInput): AgentSafetyReport {
  const warnings: string[] = [];
  let level: SafetyLevel = "low";

  for (const file of selected(input)) {
    const body = content(file);
    const path = text(file.path);
    if (/(curl\b[^|]{0,200}\|\s*(bash|sh))|(wget\b[^|]{0,200}\|\s*(bash|sh))|bash\s+<\(\s*curl/iu.test(body)) {
      addWarning(warnings, `${path || "Evidence"} contains a remote shell install command.`);
      level = "high";
    }
    if (/powershell\s+-enc|invoke-webrequest[\s\S]{0,120}\|\s*iex/iu.test(body)) {
      addWarning(warnings, `${path || "Evidence"} contains a risky PowerShell execution pattern.`);
      level = "high";
    }
    if (/\brm\s+-rf\b|chmod\s+\+x[\s\S]{0,80}\.\/|\bsudo\b/iu.test(body)) {
      addWarning(warnings, `${path || "Evidence"} contains destructive or privileged command patterns.`);
      if (level === "low") level = "medium";
    }
    if (/(ignore previous instructions|system prompt|developer message|disable safety|bypass policy)/iu.test(body)) {
      addWarning(warnings, `${path || "Evidence"} contains prompt-injection language.`);
      if (level === "low") level = "medium";
    }
    if (/(exfiltrate|send|post|fetch)[\s\S]{0,160}(\.env|~\/\.ssh|id_rsa|secret|token)|(~\/\.ssh|id_rsa)[\s\S]{0,160}(exfiltrate|send|post|fetch)/iu.test(body)) {
      addWarning(warnings, `${path || "Evidence"} appears to request secret access or exfiltration.`);
      level = "critical";
    }
  }

  const scripts = packageScripts(input);
  for (const script of ["preinstall", "postinstall", "prepare"]) {
    if (typeof scripts[script] === "string") {
      addWarning(warnings, `package.json defines a ${script} lifecycle script.`);
      if (level === "low") level = "medium";
    }
  }

  if (skipped(input).some((file) => text(file.reason) === "suspicious_secret")) {
    addWarning(warnings, "Repository evidence included a suspicious secret-like file that was skipped.");
    if (level === "low") level = "medium";
  }

  return { level, warnings, disclaimer: SAFETY_DISCLAIMER };
}

function band(score: number): { band: ReadinessBand; label: string } {
  if (score >= 90) return { band: "excellent", label: "Excellent" };
  if (score >= 75) return { band: "strong", label: "Strong" };
  if (score >= 60) return { band: "usable", label: "Usable" };
  if (score >= 40) return { band: "needs_work", label: "Needs Work" };
  return { band: "hard_for_agents", label: "Hard for Agents" };
}

function roleCount(input: AgentReadinessInput): number {
  const roles = new Set<string>();
  for (const file of selected(input)) {
    const path = lowerPath(file);
    if (/(^|\/)(readme|contributing|agents|architecture)(\.|$)/u.test(path)) roles.add("docs");
    if (/(^|\/)(package\.json|pyproject\.toml|cargo\.toml|go\.mod)$/u.test(path)) roles.add("manifest");
    if (/(^|\/)(src|app|lib|routes|pages|server)\//u.test(path)) roles.add("source");
    if (/\.(test|spec)\./u.test(path)) roles.add("tests");
    if (/(^|\/)\.github\/workflows\//u.test(path)) roles.add("ci");
  }
  return roles.size;
}

function computeBreakdown(input: AgentReadinessInput, safety: AgentSafetyReport, commands: string[]): ReadinessBreakdownItem[] {
  const warningText = qualityWarnings(input).join(" ").toLowerCase();
  const docsReasons: string[] = [];
  let documentation = 0;
  if (hasSelected(input, /(^|\/)readme(\.|$)/u)) {
    documentation += 10;
    docsReasons.push("README evidence found.");
  }
  if (hasSelected(input, /(^|\/)(docs|contributing|architecture)\b/u)) {
    documentation += 5;
    docsReasons.push("Supporting documentation evidence found.");
  }
  if (qualityPassed(input)) {
    documentation += 5;
    docsReasons.push("Generated brief passed quality checks.");
  } else if (qualityWarnings(input).length) {
    docsReasons.push("Quality warning reduced documentation confidence.");
  }

  const setupReasons: string[] = [];
  let setup = 0;
  if (hasSelected(input, /(^|\/)(package\.json|pyproject\.toml|cargo\.toml|go\.mod)$/u)) {
    setup += 6;
    setupReasons.push("Project manifest found.");
  }
  if (hasPath(input, /(^|\/)\.env\.example$/u)) {
    setup += 5;
    setupReasons.push(".env.example found.");
  }
  if (selected(input).some((file) => /(setup|install)/iu.test(content(file)) || /(setup|install)/u.test(lowerPath(file)))) {
    setup += 2;
    setupReasons.push("Setup or install guidance detected.");
  }
  if (commands.length) {
    setup += 2;
    setupReasons.push("Verification command found.");
  }

  const architectureReasons: string[] = [];
  let architecture = 0;
  if (hasSelected(input, /(^|\/)(page|route|main|index|app|server)\.[a-z0-9]+$/u)) {
    architecture += 7;
    architectureReasons.push("Entrypoint evidence selected.");
  }
  if (hasSelected(input, /(^|\/)(src|app|lib|routes|pages|server)\//u)) {
    architecture += 7;
    architectureReasons.push("Source structure evidence selected.");
  }
  if (roleCount(input) >= 3) {
    architecture += 4;
    architectureReasons.push("Evidence covers multiple repository roles.");
  }
  if (!/citation/iu.test(warningText)) {
    architecture += 2;
    architectureReasons.push("No citation quality warning recorded.");
  } else {
    architectureReasons.push("Citation quality warning reduced architecture clarity.");
  }

  const testReasons: string[] = [];
  let tests = 0;
  if (hasPath(input, /\.(test|spec)\./u)) {
    tests += 7;
    testReasons.push("Test/spec files detected.");
  }
  if (commands.some((command) => /test/u.test(command))) {
    tests += 5;
    testReasons.push("Test command detected.");
  }
  if (hasPath(input, /(^|\/)\.github\/workflows\//u)) {
    tests += 3;
    testReasons.push("CI workflow detected.");
  }

  const taskReasons: string[] = [];
  let taskability = 0;
  if (hasPath(input, /(^|\/)agents\.md$/u)) {
    taskability += 6;
    taskReasons.push("AGENTS.md found.");
  }
  if (commands.length) {
    taskability += 5;
    taskReasons.push("Verification commands are available.");
  }
  const maxLargest = Math.max(0, ...largest(input).map((file) => typeof file.estimatedTokens === "number" ? file.estimatedTokens : Math.ceil((Number(file.size) || 0) / 4)));
  if (maxLargest < 30_000) {
    taskability += 4;
    taskReasons.push("Largest files look manageable for targeted agent work.");
  }
  if (qualityPassed(input)) {
    taskability += 3;
    taskReasons.push("Brief quality passed.");
  } else if (qualityWarnings(input).length) {
    taskReasons.push("Quality warning reduced taskability.");
  }
  if ((input.evidence?.selectedFiles?.length ?? 0) >= 5) {
    taskability += 2;
    taskReasons.push("Enough selected evidence for a focused handoff.");
  }

  const riskReasons: string[] = [];
  let risk = 0;
  if (safety.level === "low") {
    risk += 6;
    riskReasons.push("No high-risk safety warning detected.");
  } else {
    riskReasons.push(`${safety.level} safety warning detected.`);
  }
  const lowSignalSkips = skipped(input).filter((file) => ["too_large", "generated_or_build"].includes(text(file.reason))).length;
  if (lowSignalSkips <= Math.max(2, selected(input).length)) {
    risk += 2;
    riskReasons.push("Skipped file volume is manageable.");
  }
  if (!skipped(input).some((file) => text(file.reason) === "suspicious_secret")) {
    risk += 2;
    riskReasons.push("No suspicious secret-like skipped file recorded.");
  }

  return [
    { key: "documentation", label: "Documentation clarity", score: clamp(documentation, 20), max: 20, reasons: docsReasons },
    { key: "setup", label: "Setup clarity", score: clamp(setup, 15), max: 15, reasons: setupReasons },
    { key: "architecture", label: "Architecture clarity", score: clamp(architecture, 20), max: 20, reasons: architectureReasons },
    { key: "tests", label: "Test visibility", score: clamp(tests, 15), max: 15, reasons: testReasons },
    { key: "taskability", label: "Agent taskability", score: clamp(taskability, 20), max: 20, reasons: taskReasons },
    { key: "risk", label: "Risk / complexity", score: clamp(risk, 10), max: 10, reasons: riskReasons },
  ];
}

function confidence(input: AgentReadinessInput): Confidence {
  const selectedCount = input.evidence?.selectedFiles?.length ?? 0;
  const filesRead = input.evidence?.filesRead ?? selectedCount;
  const readFailures = skipped(input).filter((file) => text(file.reason) === "read_failed").length;
  const hasCoreEvidence = hasPath(input, /(^|\/)(readme(\.|$)|package\.json|pyproject\.toml|cargo\.toml|go\.mod)$/u);
  if (filesRead >= 7 && selectedCount >= 5 && hasCoreEvidence && qualityPassed(input)) return "high";
  if (filesRead >= 3 && selectedCount >= 3 && readFailures < 3 && !qualityWarnings(input).length) return "medium";
  return "low";
}

function improvements(input: AgentReadinessInput, commands: string[], safety: AgentSafetyReport): string[] {
  const rows: string[] = [];
  if (!hasSelected(input, /(^|\/)readme(\.|$)/u)) rows.push("Add or improve README.md with setup, purpose, and usage notes.");
  if (!hasPath(input, /(^|\/)agents\.md$/u)) rows.push("Add AGENTS.md with coding-agent instructions.");
  if (!hasPath(input, /(^|\/)\.env\.example$/u)) rows.push("Add .env.example and document required variables.");
  if (!hasPath(input, /\.(test|spec)\./u)) rows.push("Add a minimal smoke test for the main runtime path.");
  if (!commands.length) rows.push("Document at least one verification command.");
  if (largest(input).some((file) => (typeof file.estimatedTokens === "number" ? file.estimatedTokens : 0) > 30_000)) {
    rows.push("Split or isolate very large files before broad agent refactors.");
  }
  if (safety.warnings.length) rows.push("Review risky install or secret-handling patterns before running commands.");
  return rows.slice(0, 6);
}

function strengths(input: AgentReadinessInput, commands: string[]): string[] {
  const rows: string[] = [];
  if (hasSelected(input, /(^|\/)readme(\.|$)/u)) rows.push("README evidence gives agents an entry point.");
  if (hasSelected(input, /(^|\/)(package\.json|pyproject\.toml|cargo\.toml|go\.mod)$/u)) rows.push("Project manifest makes setup and tooling easier to infer.");
  if (commands.length) rows.push("Verification commands are available for agent changes.");
  if (hasPath(input, /\.(test|spec)\./u)) rows.push("Tests are visible in repository evidence.");
  if (qualityPassed(input)) rows.push("Generated brief passed quality checks.");
  return rows.slice(0, 5);
}

export function buildBestNextPrompt(input: AgentReadinessInput): string {
  const evidencePaths = selected(input)
    .map((file) => text(file.path))
    .filter(Boolean)
    .slice(0, 3);
  const commands = detectVerificationCommands(input);
  const safety = detectSafetyWarnings(input);
  const nextImprovements = improvements(input, commands, safety).slice(0, 2);
  const focus = nextImprovements.length
    ? nextImprovements.map((item) => `- ${item}`).join("\n")
    : "- Make one small, evidence-backed improvement to the repository handoff.";
  const evidence = evidencePaths.length
    ? evidencePaths.map((path) => `- ${path}`).join("\n")
    : "- selected repository evidence";
  const checks = commands.length ? commands.map((command) => `- ${command}`).join("\n") : "- No clear verification command found.";
  return `Inspect ${input.repository ?? "this repository"} and improve its AI-agent readiness.

Focus on:
${focus}

Use evidence from:
${evidence}

Do not refactor unrelated files.
Run these checks if available:
${checks}`;
}

export function computeAgentReadiness(input: AgentReadinessInput): AgentReadinessReport {
  const commands = detectVerificationCommands(input);
  const safety = detectSafetyWarnings(input);
  const breakdown = computeBreakdown(input, safety, commands);
  let score = breakdown.reduce((sum, item) => sum + item.score, 0);
  if (safety.level === "critical") score = Math.min(score, 59);
  const classified = band(score);
  return {
    score,
    band: classified.band,
    label: classified.label,
    confidence: confidence(input),
    breakdown,
    strengths: strengths(input, commands),
    improvements: improvements(input, commands, safety),
    bestNextPrompt: buildBestNextPrompt(input),
    verificationCommands: commands,
    safety,
  };
}
