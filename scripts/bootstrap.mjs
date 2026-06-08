import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const isDoctorMode = process.argv.includes("--doctor");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function statusLine(label, value, detail = "") {
  const suffix = detail ? ` ${detail}` : "";
  console.log(`${label.padEnd(18)} ${value}${suffix}`);
}

function fail(message) {
  console.error(`\nBootstrap failed: ${message}`);
  process.exit(1);
}

function currentPlatformLabel() {
  if (process.platform === "darwin" && process.arch === "arm64") return "macos-arm64";
  if (process.platform === "darwin" && process.arch === "x64") return "macos-x64";
  if (process.platform === "linux" && process.arch === "arm64") return "linux-arm64";
  if (process.platform === "linux" && process.arch === "x64") return "linux-x64";
  if (process.platform === "win32" && process.arch === "x64") return "windows-x64";
  return `${process.platform}-${process.arch}`;
}

function checkRoot() {
  const packageJsonPath = path.join(rootDir, "package.json");
  if (!existsSync(packageJsonPath)) {
    fail(`repo root not found at ${rootDir}`);
  }
  if (process.cwd() !== rootDir) {
    statusLine("Working directory", "WARN", `expected ${rootDir} but got ${process.cwd()}`);
  } else {
    statusLine("Working directory", "OK", rootDir);
  }
}

function checkNodeModules() {
  const nodeModulesPath = path.join(rootDir, "node_modules");
  if (!existsSync(nodeModulesPath)) {
    return {
      ok: false,
      reason: "Dependencies are missing. A fresh install is required.",
    };
  }

  const tsxBin = path.join(rootDir, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
  try {
    const result = spawnSync(tsxBin, ["--eval", "console.log('ok')"], {
      cwd: rootDir,
      stdio: "pipe",
      encoding: "utf8",
      env: process.env,
    });
    if (result.status === 0) {
      return { ok: true, reason: `native modules match ${currentPlatformLabel()}` };
    }
    const message = [result.stdout, result.stderr].filter(Boolean).join("\n");
    return {
      ok: false,
      reason: /another platform/iu.test(message)
        ? `native modules were installed for another platform. Reinstall for ${currentPlatformLabel()}.`
        : "native dependency check failed. Reinstall dependencies.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      reason: /another platform/iu.test(message)
        ? `native modules were installed for another platform. Reinstall for ${currentPlatformLabel()}.`
        : "native dependency check failed. Reinstall dependencies.",
    };
  }
}

function runPnpmInstall() {
  console.log("\nRunning npm exec pnpm install ...\n");
  const result = spawnSync(npmCommand, ["exec", "pnpm", "install"], {
    cwd: rootDir,
    stdio: "inherit",
    env: { ...process.env, CI: process.env.CI ?? "true" },
  });
  if (result.status !== 0) {
    fail("npm exec pnpm install did not complete successfully.");
  }
}

function ensureHarnessCli() {
  const result = spawnSync(process.execPath, [path.join(scriptDir, "run-harness-cli.mjs"), "--ensure-only"], {
    cwd: rootDir,
    stdio: "pipe",
    encoding: "utf8",
    env: process.env,
  });

  if (result.status === 0) {
    statusLine("Harness CLI", "OK", result.stdout.trim() || "ready");
    return;
  }

  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  statusLine("Harness CLI", "WARN", output || "current platform artifact is missing");
}

function printNextSteps() {
  console.log("\nNext commands");
  console.log("- npm exec pnpm dev");
  console.log("- npm exec pnpm test");
  console.log("- npm exec pnpm lint");
  console.log("- npm exec pnpm build");
  console.log("- npm run harness -- query matrix");
}

checkRoot();

const dependencyCheck = checkNodeModules();
statusLine("Dependencies", dependencyCheck.ok ? "OK" : "WARN", dependencyCheck.reason);

if (!isDoctorMode && !dependencyCheck.ok) {
  runPnpmInstall();
  const afterInstall = checkNodeModules();
  statusLine("Dependencies", afterInstall.ok ? "OK" : "WARN", afterInstall.reason);
  if (!afterInstall.ok) {
    fail(afterInstall.reason);
  }
}

ensureHarnessCli();

if (isDoctorMode) {
  printNextSteps();
  process.exit(0);
}

console.log("\nBootstrap complete.");
printNextSteps();
