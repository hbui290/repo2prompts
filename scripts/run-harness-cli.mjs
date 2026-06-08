import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const binDir = path.join(scriptDir, "bin");
const ensureOnly = process.argv.includes("--ensure-only");
const passthroughArgs = process.argv.slice(2).filter((arg) => arg !== "--ensure-only");

function currentPlatformLabel() {
  if (process.platform === "darwin" && process.arch === "arm64") return "macos-arm64";
  if (process.platform === "darwin" && process.arch === "x64") return "macos-x64";
  if (process.platform === "linux" && process.arch === "arm64") return "linux-arm64";
  if (process.platform === "linux" && process.arch === "x64") return "linux-x64";
  if (process.platform === "win32" && process.arch === "x64") return "windows-x64";
  return null;
}

function releaseBaseUrl(tag) {
  const configured = process.env.HARNESS_CLI_BASE_URL?.trim().replace(/\/+$/u, "");
  if (configured) return configured;
  return `https://github.com/hoangnb24/repository-harness/releases/download/${tag}`;
}

function artifactName(label) {
  return label === "windows-x64" ? `harness-cli-${label}.exe` : `harness-cli-${label}`;
}

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`download failed with status ${response.status} for ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function ensureArtifact(label) {
  mkdirSync(binDir, { recursive: true });
  const overridePath = process.env.HARNESS_CLI_BINARY_OVERRIDE?.trim();
  if (overridePath) {
    if (!existsSync(overridePath)) {
      throw new Error(`override binary does not exist: ${overridePath}`);
    }
    return overridePath;
  }
  const name = artifactName(label);
  const targetPath = path.join(binDir, name);
  if (existsSync(targetPath)) return targetPath;

  const tag = process.env.HARNESS_CLI_RELEASE_TAG?.trim() || "harness-cli-v0.1.4";
  const baseUrl = releaseBaseUrl(tag);
  const artifactUrl = `${baseUrl}/${name}`;
  const checksumUrl = `${artifactUrl}.sha256`;

  const [binary, checksum] = await Promise.all([download(artifactUrl), download(checksumUrl)]);
  const expected = checksum.toString("utf8").trim().split(/\s+/u)[0];
  const actual = createHash("sha256").update(binary).digest("hex");
  if (expected && actual !== expected) {
    throw new Error(`checksum mismatch for ${name}`);
  }

  writeFileSync(targetPath, binary);
  if (process.platform !== "win32") {
    chmodSync(targetPath, 0o755);
  }
  writeFileSync(`${targetPath}.sha256`, checksum);
  return targetPath;
}

async function main() {
  const label = currentPlatformLabel();
  if (!label) {
    console.error(`Unsupported platform for harness-cli: ${process.platform}-${process.arch}`);
    process.exit(1);
  }

  let binaryPath;
  try {
    binaryPath = await ensureArtifact(label);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      [
        `Harness CLI for ${label} is not available locally.`,
        "Run `npm run bootstrap` to retry the download, or set HARNESS_CLI_BASE_URL / HARNESS_CLI_RELEASE_TAG to a valid artifact source.",
        `Detail: ${message}`,
      ].join("\n"),
    );
    process.exit(1);
  }

  if (passthroughArgs.length === 1 && (passthroughArgs[0] === "--version" || passthroughArgs[0] === "version")) {
    const versionTag = process.env.HARNESS_CLI_RELEASE_TAG?.trim() || "harness-cli-v0.1.4";
    console.log(`${versionTag} (${path.basename(binaryPath)})`);
    return;
  }

  if (ensureOnly) {
    const checksumPath = `${binaryPath}.sha256`;
    const checksumNote = existsSync(checksumPath) ? ` with checksum ${path.basename(checksumPath)}` : "";
    console.log(`using ${path.relative(process.cwd(), binaryPath)}${checksumNote}`);
    return;
  }

  const result = spawnSync(binaryPath, passthroughArgs, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });
  process.exit(result.status ?? 1);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
