import assert from "node:assert/strict";
import test from "node:test";

import type { AgentReadinessReport } from "@/domain/agent-readiness";
import { buildReportArtifact } from "@/domain/report-artifact";
import type { StoredBrief } from "@/integrations/brief-store";

function readiness(score: number, label = "Strong"): AgentReadinessReport {
  return {
    score,
    band: score >= 80 ? "strong" : score >= 60 ? "usable" : "needs_work",
    label,
    confidence: score >= 80 ? "high" : "medium",
    breakdown: [
      { key: "documentation", label: "Documentation clarity", score: 12, max: 20, reasons: ["README evidence found."] },
      { key: "setup", label: "Setup clarity", score: 8, max: 15, reasons: ["Project manifest found."] },
      { key: "architecture", label: "Architecture clarity", score: 12, max: 20, reasons: ["Entrypoint evidence selected."] },
      { key: "tests", label: "Test visibility", score: 4, max: 15, reasons: ["No test evidence selected."] },
      { key: "taskability", label: "Agent taskability", score: 10, max: 20, reasons: ["Largest files look manageable."] },
      { key: "risk", label: "Risk / complexity", score: 8, max: 10, reasons: ["No high-risk safety warning detected."] },
    ],
    strengths: ["README evidence gives agents an entry point.", "Generated brief passed quality checks."],
    improvements: ["Add a minimal smoke test.", "Document required environment variables."],
    bestNextPrompt: "Inspect owner/repo and implement the next task without refactoring unrelated files.",
    verificationCommands: ["npm test"],
    safety: {
      level: "low",
      warnings: [],
      disclaimer: "Not a security guarantee.",
    },
  };
}

function brief(overrides: Partial<StoredBrief> = {}): StoredBrief {
  return {
    id: "report-1",
    repository_key: "owner/repo",
    analysis_mode: "build",
    analysis_depth: "balanced",
    evidence_fingerprint: "abc123",
    title: "owner/repo",
    brief_markdown: [
      "# Product purpose",
      "This repository appears to be a small app. [README.md]",
      "",
      "# Architecture and data flow",
      "The app uses API routes and a package manifest. [app/api/route.ts] [package.json]",
      "",
      "# Verification plan",
      "- Run `npm test`.",
    ].join("\n"),
    evidence_json: {
      filesRead: 3,
      treeEntries: 18,
      estimatedTokens: 4200,
      selectedFiles: [
        { path: "README.md", reason: "documentation", estimatedTokens: 800 },
        { path: "package.json", reason: "manifest", estimatedTokens: 200 },
        { path: "app/api/route.ts", reason: "route", estimatedTokens: 900 },
      ],
      skippedFiles: [{ path: ".env", reason: "sensitive_path" }],
      largestFiles: [{ path: "app/api/route.ts", estimatedTokens: 900 }],
      analysis: {
        pipeline: "repository_map",
        repositoryMapSource: "generated",
        modulesAnalyzed: 0,
        evidenceFingerprint: "abc123",
        quality: { passed: true, warnings: [], repaired: false },
      },
    },
    created_at: "2026-06-08T00:00:00.000Z",
    view_count: 2,
    ...overrides,
  };
}

test("sparse repo produces limited-evidence verdict and meaningful unknowns", () => {
  const artifact = buildReportArtifact({
    brief: brief({
      evidence_json: {
        filesRead: 1,
        treeEntries: 1,
        selectedFiles: [{ path: "README.md", reason: "documentation" }],
        skippedFiles: [],
        largestFiles: [],
      },
    }),
    readiness: readiness(42, "Needs Work"),
  });

  assert.equal(artifact.verdict.title, "Limited evidence. Useful for orientation, not implementation yet.");
  assert.ok(artifact.unknown.some((item) => /test|verification|setup|environment/i.test(item)));
  assert.ok(artifact.confirmed.every((item) => item.length < 120));
});

test("build mode creates build-specific section labels", () => {
  const artifact = buildReportArtifact({ brief: brief({ analysis_mode: "build" }), readiness: readiness(82) });
  assert.deepEqual(artifact.modeSections.map((section) => section.title), [
    "What this repo appears to do",
    "Implementation signals",
    "Suggested build order",
    "Risks / missing clarity",
    "Verification checklist",
  ]);
  assert.equal(artifact.primaryAction.label, "Copy implementation brief");
});

test("review mode creates finding-first section labels and review action", () => {
  const artifact = buildReportArtifact({ brief: brief({ analysis_mode: "review" }), readiness: readiness(72, "Usable") });
  assert.deepEqual(artifact.modeSections.map((section) => section.title), [
    "Top findings",
    "Risk areas",
    "Missing checks",
    "Evidence references",
    "Suggested next review steps",
  ]);
  assert.equal(artifact.primaryAction.label, "Copy review checklist");
  assert.match(artifact.verdict.title, /Review-ready|Review summary/u);
});

test("prompt mode exposes copyable handoff action", () => {
  const artifact = buildReportArtifact({ brief: brief({ analysis_mode: "prompt" }), readiness: readiness(85) });
  assert.equal(artifact.primaryAction.label, "Copy agent handoff");
  assert.equal(artifact.modeSections[0]?.title, "Copyable agent handoff");
});

test("debug mode exposes likely failure and checks sections", () => {
  const artifact = buildReportArtifact({ brief: brief({ analysis_mode: "debug" }), readiness: readiness(68, "Usable") });
  assert.deepEqual(artifact.modeSections.map((section) => section.title), [
    "Likely failure points",
    "Symptoms / suspected causes",
    "Checks to run",
    "Suggested fixes",
    "Confidence notes",
  ]);
  assert.equal(artifact.primaryAction.label, "Copy debugging checklist");
});

test("debug mode keeps operational actions in checks and recommendations out of unknown", () => {
  const debugBrief = brief({
    analysis_mode: "debug",
    brief_markdown: [
      "# Runtime path summary",
      "The workflow uploads artifacts through [scripts/upload-artifact.ts].",
      "",
      "# Likely failure areas",
      "- Artifact path mismatch between workflow output and script input.",
      "- Missing permissions for workflow artifact write.",
      "",
      "# Diagnostic steps",
      "- Print the resolved artifact path before upload.",
      "- Confirm workflow permissions include actions write access.",
      "- Check whether the file exists before the upload call.",
      "",
      "# Minimal fixes",
      "- Normalize the artifact path in [scripts/upload-artifact.ts].",
      "- Add a workflow step that lists output directory contents.",
      "",
      "# Inferences and unknowns",
      "The selected evidence does not include the failing run logs.",
    ].join("\n"),
    evidence_json: {
      filesRead: 11,
      treeEntries: 88,
      selectedFiles: [
        { path: ".github/workflows/ci.yml", reason: "workflow config", estimatedTokens: 740 },
        { path: "scripts/upload-artifact.ts", reason: "focused question match", estimatedTokens: 860 },
      ],
      skippedFiles: [],
      largestFiles: [{ path: "scripts/upload-artifact.ts", estimatedTokens: 860 }],
      analysis: {
        pipeline: "repository_map",
        repositoryMapSource: "generated",
        modulesAnalyzed: 0,
        evidenceFingerprint: "debug123",
        quality: { passed: true, warnings: [], repaired: false },
      },
    },
  });
  const artifact = buildReportArtifact({
    brief: debugBrief,
    readiness: {
      ...readiness(68, "Usable"),
      improvements: ["Add README.", "Add AGENTS.md.", "Add .env.example."],
      verificationCommands: [],
    },
  });

  const symptoms = artifact.modeSections.find((section) => section.title === "Symptoms / suspected causes")?.items ?? [];
  const likelyFailures = artifact.modeSections.find((section) => section.title === "Likely failure points")?.items ?? [];
  const checks = artifact.modeSections.find((section) => section.title === "Checks to run")?.items ?? [];
  const fixes = artifact.modeSections.find((section) => section.title === "Suggested fixes")?.items ?? [];

  assert.ok(checks.some((item) => /Print the resolved artifact path/u.test(item)));
  assert.ok(checks.some((item) => /Check whether the file exists/u.test(item)));
  assert.ok(!symptoms.some((item) => /Print the resolved artifact path|Check whether the file exists/u.test(item)));
  assert.ok(!likelyFailures.some((item) => /failing run logs/u.test(item)));
  assert.ok(fixes.some((item) => /Normalize the artifact path/u.test(item)));
  assert.ok(fixes.some((item) => /Add README/u.test(item)));
  assert.ok(!artifact.unknown.some((item) => /Add README|Add AGENTS|Add \\.env/u.test(item)));
  assert.ok(!artifact.confirmed.some((item) => /Generated report|quality checks/u.test(item)));
  assert.ok(!artifact.inferred.some((item) => /Generated brief|quality checks/u.test(item)));
});

test("migration mode exposes sequence risk and rollback sections", () => {
  const artifact = buildReportArtifact({ brief: brief({ analysis_mode: "migration" }), readiness: readiness(68, "Usable") });
  assert.deepEqual(artifact.modeSections.map((section) => section.title), [
    "Current state",
    "Migration target",
    "Risky edges",
    "Migration sequence",
    "Validation / rollback guidance",
  ]);
  assert.equal(artifact.primaryAction.label, "Copy migration plan");
});

test("risk sections keep markdown risk items and only append unknown fallback when sparse", () => {
  const artifact = buildReportArtifact({
    brief: brief({
      analysis_mode: "review",
      brief_markdown: [
        "# Top findings",
        "- Builds can fail when environment variables are missing.",
        "",
        "# Risk areas",
        "- Workflow permissions may block deployment writes.",
        "- Missing rollback notes increase migration risk.",
        "",
        "# Missing checks",
        "- No smoke test for deployment path.",
      ].join("\n"),
    }),
    readiness: readiness(70, "Usable"),
  });

  const riskItems = artifact.modeSections.find((section) => section.title === "Risk areas")?.items ?? [];
  assert.ok(riskItems.some((item) => /Workflow permissions may block deployment writes/u.test(item)));
  assert.ok(riskItems.some((item) => /Missing rollback notes increase migration risk/u.test(item)));
});

test("review missing checks does not fall back to generic inference content", () => {
  const artifact = buildReportArtifact({
    brief: brief({
      analysis_mode: "review",
      brief_markdown: [
        "# Top findings",
        "- The API route has a clear entrypoint.",
        "",
        "# Inferences and unknowns",
        "Inference: The pipeline likely depends on normalized provider outputs.",
        "",
        "# Missing checks",
        "- No smoke test covers the report export path.",
      ].join("\n"),
    }),
    readiness: readiness(70, "Usable"),
  });

  const missingChecks = artifact.modeSections.find((section) => section.title === "Missing checks")?.items ?? [];
  assert.ok(missingChecks.some((item) => /No smoke test covers the report export path/u.test(item)));
  assert.ok(missingChecks.some((item) => /Required environment variables/u.test(item)));
  assert.ok(!missingChecks.some((item) => /normalized provider outputs/u.test(item)));
});

test("verification sections keep markdown checks and append verification commands", () => {
  const artifact = buildReportArtifact({
    brief: brief({
      analysis_mode: "build",
      brief_markdown: [
        "# Product purpose",
        "Small app. [README.md]",
        "",
        "# Verification plan",
        "- Run the smoke endpoint after deploy.",
        "- Confirm cached report retrieval works.",
      ].join("\n"),
    }),
    readiness: {
      ...readiness(82),
      verificationCommands: ["npm test", "npm run build"],
    },
  });

  const checks = artifact.modeSections.find((section) => section.title === "Verification checklist")?.items ?? [];
  assert.ok(checks.some((item) => /Run the smoke endpoint after deploy/u.test(item)));
  assert.ok(checks.some((item) => /Confirm cached report retrieval works/u.test(item)));
  assert.ok(checks.some((item) => item === "npm test"));
  assert.ok(checks.some((item) => item === "npm run build"));
});

test("inferred excludes pipeline meta and keeps repo-level inference only", () => {
  const artifact = buildReportArtifact({
    brief: brief({
      brief_markdown: [
        "# Product purpose",
        "Small app. [README.md]",
        "",
        "# Inferences and unknowns",
        "Inference: The API layer likely depends on the package manifest for runtime configuration.",
        "The selected evidence does not include production logs.",
      ].join("\n"),
    }),
    readiness: readiness(80),
  });

  assert.ok(artifact.inferred.some((item) => /API layer likely depends on the package manifest/u.test(item)));
  assert.ok(!artifact.inferred.some((item) => /depth controls how much evidence was selected/u.test(item)));
});

test("legacy evidence without readiness still produces a usable artifact", () => {
  const artifact = buildReportArtifact({ brief: brief(), readiness: undefined });
  assert.equal(artifact.qualitySnapshot.scoreLabel, "not recorded");
  assert.ok(artifact.verdict.title.length > 0);
  assert.ok(artifact.modeSections.length > 0);
});
