import assert from "node:assert/strict";
import test from "node:test";

import { requestModelJson, requestModelText } from "./model-client";

function withModelEnv(run: () => Promise<void>) {
  const previous = { ...process.env };
  process.env.MODEL_BASE_URL = "http://model.test/v1";
  process.env.MODEL_API_KEY = "secret";
  process.env.MODEL_CHAT_ID = "default";
  process.env.MODEL_ANALYSIS_ID = "analyst";
  process.env.MODEL_WRITER_ID = "writer";
  return run().finally(() => {
    process.env = previous;
  });
}

test("selects analyst and writer models by task", async () => withModelEnv(async () => {
  const models: string[] = [];
  const fetcher: typeof fetch = async (_input, init) => {
    models.push(JSON.parse(String(init?.body)).model as string);
    return Response.json({ choices: [{ message: { content: "ok" } }] });
  };
  await requestModelText("repository_analysis", "map", fetcher);
  await requestModelText("brief_writing", "write", fetcher);
  assert.deepEqual(models, ["analyst", "writer"]);
}));

test("retries malformed JSON exactly once", async () => withModelEnv(async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls += 1;
    return Response.json({
      choices: [{ message: { content: calls === 1 ? "not json" : '```json\n{"ok":true}\n```' } }],
    });
  };
  const result = await requestModelJson<{ ok: boolean }>("repository_analysis", "map", fetcher);
  assert.deepEqual(result, { ok: true });
  assert.equal(calls, 2);
}));

test("does not retry provider HTTP failures", async () => withModelEnv(async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls += 1;
    return new Response("failed", { status: 503 });
  };
  await assert.rejects(() => requestModelJson("repository_analysis", "map", fetcher), /503/);
  assert.equal(calls, 1);
}));
