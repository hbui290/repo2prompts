import assert from "node:assert/strict";
import test from "node:test";

import { buildBadgeSvg, parseBadgeRepository, GET } from "./[...repository]/route";

test("parses owner and repository from catch-all route params", () => {
  assert.equal(parseBadgeRepository(["vercel", "next.js"]), "vercel/next.js");
  assert.equal(parseBadgeRepository(["facebook"]), null);
});

test("builds escaped readiness badge svg", () => {
  const svg = buildBadgeSvg({ score: 82, label: "Strong & Ready" });

  assert.match(svg, /Repo2Prompts/u);
  assert.match(svg, /AI Ready 82 Strong &amp; Ready/u);
  assert.doesNotMatch(svg, /Strong & Ready/u);
});

test("unknown badge request returns an svg without generating a report", async () => {
  const response = await GET(new Request("http://localhost/api/badge/acme/tool"), {
    params: Promise.resolve({ repository: ["acme", "tool"] }),
  });
  const body = await response.text();

  assert.equal(response.headers.get("content-type"), "image/svg+xml");
  assert.match(body, /AI Ready unknown/u);
});
