import assert from "node:assert/strict";
import test from "node:test";

import { buildRelationshipGraph } from "./relationship-graph";

test("extracts relative TypeScript imports and shared environment signals", () => {
  const graph = buildRelationshipGraph([
    {
      path: "src/app.ts",
      role: "entrypoint",
      content: 'import { auth } from "./auth";\nconst key = process.env.API_URL;',
    },
    {
      path: "src/auth.ts",
      role: "service",
      content: "const url = process.env.API_URL;",
    },
  ]);
  assert.equal(graph.edges.some((edge) => edge.kind === "import" && edge.to === "src/auth.ts"), true);
  assert.equal(graph.edges.some((edge) => edge.kind === "environment"), true);
});

test("extracts relative Python imports", () => {
  const graph = buildRelationshipGraph([
    { path: "app/main.py", role: "entrypoint", content: "from .auth import login" },
    { path: "app/auth.py", role: "service", content: "def login(): pass" },
  ]);
  assert.equal(graph.edges.some((edge) => edge.kind === "import" && edge.to === "app/auth.py"), true);
});
