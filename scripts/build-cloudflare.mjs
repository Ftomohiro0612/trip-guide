import { spawnSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { finalizeCloudflareWorker } from "./finalize-cloudflare-worker.mjs";

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env.local");
const vercelEnvPath = resolve(root, ".vercel/.env.production.local");
const configuredEnvPath = process.env.MEMORIP_CLOUDFLARE_ENV_FILE
  ? resolve(process.env.MEMORIP_CLOUDFLARE_ENV_FILE)
  : null;
const backupPath = resolve(root, ".env.local.cloudflare-backup");
const compiledEnvPath = resolve(root, ".open-next/cloudflare/next-env.mjs");
const publicKey = /^(?:NEXT_PUBLIC_[A-Z0-9_]+|SITE_URL)$/;

const prepareRuntimeCanon = spawnSync(
  process.execPath,
  [resolve(root, "scripts/prepare-runtime-canon.mjs")],
  {
    cwd: root,
    stdio: "inherit",
  },
);
if (prepareRuntimeCanon.error) throw prepareRuntimeCanon.error;
if (prepareRuntimeCanon.status !== 0) {
  throw new Error(
    `Unable to prepare @memorip/runtime-canon (exit ${prepareRuntimeCanon.status ?? "unknown"}).`,
  );
}

if (existsSync(backupPath)) {
  if (!existsSync(envPath)) {
    renameSync(backupPath, envPath);
    throw new Error("Recovered .env.local from an interrupted Cloudflare build. Run the command again.");
  }
  throw new Error("Refusing to overwrite the existing .env.local.cloudflare-backup file.");
}

const original = existsSync(envPath) ? readFileSync(envPath, "utf8") : null;
if (configuredEnvPath && !existsSync(configuredEnvPath)) {
  throw new Error(`Configured Cloudflare build env file was not found: ${configuredEnvPath}`);
}
const source = configuredEnvPath
  ? readFileSync(configuredEnvPath, "utf8")
  : original ?? (existsSync(vercelEnvPath) ? readFileSync(vercelEnvPath, "utf8") : "");
const sourceKeys = source
  .split(/\r?\n/)
  .map((line) => line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/)?.[1])
  .filter(Boolean);
const privateKeys = sourceKeys.filter((key) => !publicKey.test(key));
const sourcePublicValues = new Map(
  source
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(
        /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/,
      );
      if (!match || !publicKey.test(match[1])) return null;
      const rawValue = match[2];
      const value =
        (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
        (rawValue.startsWith("'") && rawValue.endsWith("'"))
          ? rawValue.slice(1, -1)
          : rawValue;
      return [match[1], value];
    })
    .filter(Boolean),
);
const requiredPublicKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "SITE_URL",
  "NEXT_PUBLIC_GA_ID",
  "NEXT_PUBLIC_VALUECOMMERCE_PID",
];
const missingPublicKey = requiredPublicKeys.find(
  (key) => !(process.env[key] || sourcePublicValues.get(key)),
);
if (missingPublicKey) {
  throw new Error(
    `Cloudflare production build requires a non-empty ${missingPublicKey}`,
  );
}
const publicLines = source
  .split(/\r?\n/)
  .filter((line) => {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    return match ? publicKey.test(match[1]) : /^\s*(?:#.*)?$/.test(line);
  })
  .join("\n");

try {
  if (original !== null) renameSync(envPath, backupPath);
  writeFileSync(envPath, publicLines, { encoding: "utf8", mode: 0o600 });

  const childEnv = { ...process.env };
  for (const privateKey of privateKeys) delete childEnv[privateKey];
  delete childEnv.MEMORIP_CLOUDFLARE_ENV_FILE;

  const cliPath = resolve(root, "node_modules/@opennextjs/cloudflare/dist/cli/index.js");
  const result = spawnSync(process.execPath, [cliPath, "build"], {
    cwd: root,
    env: {
      ...childEnv,
      NEXT_PUBLIC_CLOUDFLARE_STATIC_NAVIGATION: "true",
    },
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;

  if (result.status === 0) {
    await finalizeCloudflareWorker();
  }

  if (result.status === 0 && existsSync(compiledEnvPath)) {
    const compiledEnv = readFileSync(compiledEnvPath, "utf8");
    const leakedKey = privateKeys.find((key) => compiledEnv.includes(`\"${key}\"`));
    if (leakedKey) {
      rmSync(resolve(root, ".open-next"), { recursive: true, force: true });
      throw new Error(`Cloudflare build rejected: private environment key ${leakedKey} was embedded.`);
    }
  }
} finally {
  rmSync(envPath, { force: true });
  if (original !== null) renameSync(backupPath, envPath);
}
