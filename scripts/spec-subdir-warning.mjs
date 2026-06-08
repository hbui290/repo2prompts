import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const command = process.argv[2] ?? "bootstrap";
const rootDir = path.resolve(process.cwd(), "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

console.error(
  [
    "You are inside repo2prompt-clean-spec, which only stores product specs.",
    `Forwarding \`${command}\` to the runnable app at ${rootDir}.`,
  ].join("\n"),
);

const result = spawnSync(npmCommand, ["--prefix", rootDir, "run", command], {
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
