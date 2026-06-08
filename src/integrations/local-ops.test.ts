import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, chmodSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const rootDir = process.cwd();
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function makeFakeHarnessBinary(): string {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "repo2prompts-harness-"));
  const filename = process.platform === "win32" ? "fake-harness.cmd" : "fake-harness";
  const binaryPath = path.join(tempDir, filename);
  if (process.platform === "win32") {
    writeFileSync(binaryPath, "@echo fake harness %*\r\n");
  } else {
    writeFileSync(binaryPath, "#!/usr/bin/env sh\necho fake harness \"$@\"\n");
    chmodSync(binaryPath, 0o755);
  }
  return binaryPath;
}

test("harness wrapper supports version shim with override binary", () => {
  const fakeBinary = makeFakeHarnessBinary();
  const result = spawnSync(process.execPath, ["scripts/run-harness-cli.mjs", "--version"], {
    cwd: rootDir,
    encoding: "utf8",
    env: {
      ...process.env,
      HARNESS_CLI_BINARY_OVERRIDE: fakeBinary,
      HARNESS_CLI_RELEASE_TAG: "harness-cli-test",
    },
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /harness-cli-test/u);
  assert.match(result.stdout, /fake-harness/u);
});

test("harness wrapper ensure-only reports override binary path", () => {
  const fakeBinary = makeFakeHarnessBinary();
  const result = spawnSync(process.execPath, ["scripts/run-harness-cli.mjs", "--ensure-only"], {
    cwd: rootDir,
    encoding: "utf8",
    env: {
      ...process.env,
      HARNESS_CLI_BINARY_OVERRIDE: fakeBinary,
    },
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /fake-harness/u);
});

test("bootstrap doctor reports next commands and harness readiness", () => {
  const fakeBinary = makeFakeHarnessBinary();
  const result = spawnSync(process.execPath, ["scripts/bootstrap.mjs", "--doctor"], {
    cwd: rootDir,
    encoding: "utf8",
    env: {
      ...process.env,
      HARNESS_CLI_BINARY_OVERRIDE: fakeBinary,
    },
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Working directory/u);
  assert.match(result.stdout, /Dependencies\s+OK/u);
  assert.match(result.stdout, /Harness CLI\s+OK/u);
  assert.match(result.stdout, /npm exec pnpm dev/u);
});

test("spec directory doctor forwards to runnable app root", () => {
  const fakeBinary = makeFakeHarnessBinary();
  const specDir = path.join(rootDir, "repo2prompt-clean-spec");
  const result = spawnSync(npmCommand, ["run", "doctor"], {
    cwd: specDir,
    encoding: "utf8",
    env: {
      ...process.env,
      HARNESS_CLI_BINARY_OVERRIDE: fakeBinary,
    },
  });

  assert.equal(result.status, 0);
  const combined = `${result.stdout}\n${result.stderr}`;
  assert.match(combined, /repo2prompt-clean-spec/u);
  assert.match(combined, /Forwarding `doctor`/u);
  assert.match(combined, /Working directory\s+OK/u);
});
