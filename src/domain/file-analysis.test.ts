import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyFile,
  extractQuestionKeywords,
  rankEvidenceFiles,
  selectDiverseEvidence,
  shortlistLimit,
} from "./file-analysis";

test("classifies representative repository files", () => {
  assert.equal(classifyFile("README.md"), "documentation");
  assert.equal(classifyFile("package.json"), "manifest");
  assert.equal(classifyFile("src/app/api/users/route.ts"), "route");
  assert.equal(classifyFile("src/components/user-card.tsx"), "ui");
  assert.equal(classifyFile("supabase/migrations/001.sql"), "migration");
});

test("expands focused question keywords", () => {
  const keywords = extractQuestionKeywords("How does authentication use the database?");
  assert.equal(keywords.includes("auth"), true);
  assert.equal(keywords.includes("session"), true);
  assert.equal(keywords.includes("schema"), true);
});

test("focused ranking favors files matching question content", () => {
  const ranked = rankEvidenceFiles(
    [
      { path: "src/ui/card.tsx", size: 1000, sha: "a", content: "export function Card() {}" },
      { path: "src/lib/session.ts", size: 1000, sha: "b", content: "export function authenticateUser() {}" },
    ],
    { mode: "build", depth: "focused", question: "How does authentication work?" },
  );
  assert.equal(ranked[0]?.path, "src/lib/session.ts");
});

test("uses quality-max shortlist budgets", () => {
  assert.equal(shortlistLimit("fast"), 25);
  assert.equal(shortlistLimit("balanced"), 70);
  assert.equal(shortlistLimit("focused"), 70);
  assert.equal(shortlistLimit("deep"), 120);
});

test("relationship signals raise connected files and review reserves tests", () => {
  const ranked = rankEvidenceFiles(
    [
      { path: "src/isolated.ts", size: 100, sha: "a", content: "" },
      { path: "src/connected.ts", size: 100, sha: "b", content: "" },
      { path: "src/connected.test.ts", size: 100, sha: "c", content: "" },
    ],
    { mode: "review", depth: "balanced", relationshipScores: new Map([["src/connected.ts", 5]]) },
  );
  assert.equal(ranked[0]?.path, "src/connected.ts");
  assert.equal(selectDiverseEvidence(ranked, 2, "review").some((file) => file.role === "test"), true);
});
