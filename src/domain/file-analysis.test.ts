import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyFile,
  extractQuestionKeywords,
  rankEvidenceFiles,
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
