#!/usr/bin/env node
/**
 * Sign the extension through addons.mozilla.org (unlisted / self-distribution).
 *
 * Credentials are read from (in priority order):
 *   1. the shell environment (WEB_EXT_API_KEY / WEB_EXT_API_SECRET)
 *   2. an env file in the project root: .environment, then .env
 *
 * AMO calls these "JWT issuer" and "JWT secret"; web-ext calls them
 * "api-key" / "api-secret". Both spellings are accepted in the env file.
 *
 * Usage:  npm run sign          (real signing)
 *         npm run sign -- --check  (validate that credentials are found, no network)
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (let line of readFileSync(file, "utf8").split(/\r?\n/)) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim().replace(/^export\s+/, "");
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const envFile = process.env.TMN_ENV_FILE
  ? path.resolve(process.env.TMN_ENV_FILE)
  : [path.join(root, ".environment"), path.join(root, ".env")].find(existsSync);

const fileEnv = envFile ? loadEnvFile(envFile) : {};

const apiKey =
  process.env.WEB_EXT_API_KEY || fileEnv.WEB_EXT_API_KEY || fileEnv.JWT_ISSUER || fileEnv.API_KEY;
const apiSecret =
  process.env.WEB_EXT_API_SECRET ||
  fileEnv.WEB_EXT_API_SECRET ||
  fileEnv.JWT_SECRET ||
  fileEnv.API_SECRET;

if (!apiKey || !apiSecret) {
  console.error(
    "Missing credentials.\n" +
      "Set WEB_EXT_API_KEY / WEB_EXT_API_SECRET in the shell, or put\n" +
      "JWT_ISSUER / JWT_SECRET (AMO's names) in .environment or .env in the project root."
  );
  process.exit(1);
}

const source = envFile ? path.relative(root, envFile) : "shell environment";
console.log(
  `Credentials loaded from ${source} (issuer ${apiKey.length} chars, secret ${apiSecret.length} chars).`
);

if (process.argv.includes("--check")) {
  console.log("Check only (--check): credentials found, not contacting AMO.");
  process.exit(0);
}

const bin = process.platform === "win32" ? "web-ext.cmd" : "web-ext";
const webExt = path.join(root, "node_modules", ".bin", bin);

// Pass credentials via the environment so the secret never appears in the process list.
const result = spawnSync(
  webExt,
  ["sign", "--source-dir", ".", "--artifacts-dir", "dist", "--channel=unlisted"],
  {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, WEB_EXT_API_KEY: apiKey, WEB_EXT_API_SECRET: apiSecret },
  }
);

process.exit(result.status ?? 1);
