import assert from "node:assert/strict";
import test from "node:test";

import { logServerEvent } from "./server-log";

test("logs only safe structured fields", () => {
  const calls: string[] = [];
  const logger = (value: string) => calls.push(value);

  logServerEvent(
    "info",
    {
      route: "/api/briefs",
      requestId: "req-1",
      event: "generated",
      repository: "owner/repo",
      mode: "build",
      depth: "fast",
      durationMs: 42,
      source: "generated",
    },
    { info: logger, warn: logger, error: logger },
  );

  const parsed = JSON.parse(calls[0] ?? "{}") as Record<string, unknown>;
  assert.equal(parsed.route, "/api/briefs");
  assert.equal(parsed.requestId, "req-1");
  assert.equal(parsed.durationMs, 42);
});

test("does not log arbitrary unsafe fields", () => {
  const calls: string[] = [];
  const logger = (value: string) => calls.push(value);

  logServerEvent(
    "error",
    {
      route: "/api/briefs",
      requestId: "req-2",
      event: "failed",
      code: "MODEL_UNAVAILABLE",
      apiKey: "sk-secret",
      prompt: "full source prompt",
    } as never,
    { info: logger, warn: logger, error: logger },
  );

  assert.doesNotMatch(calls[0] ?? "", /sk-secret/u);
  assert.doesNotMatch(calls[0] ?? "", /full source prompt/u);
});
