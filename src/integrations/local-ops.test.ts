import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const rootDir = process.cwd();

test("bootstrap doctor reports next commands", () => {
  const result = spawnSync(process.execPath, ["scripts/bootstrap.mjs", "--doctor"], {
    cwd: rootDir,
    encoding: "utf8",
    env: process.env,
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Working directory/u);
  assert.match(result.stdout, /Dependencies\s+OK/u);
  assert.match(result.stdout, /npm exec pnpm dev/u);
  assert.doesNotMatch(result.stdout, /current platform artifact/u);
});
