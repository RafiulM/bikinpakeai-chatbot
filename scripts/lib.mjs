import { createServer } from "node:net";
import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { localDatabaseUrl, databaseUrl } from "./postgres.mjs";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function assertNode() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 12))
    throw new Error(
      "Install Node.js 22.12 or newer from https://nodejs.org, then try again.",
    );
}

export function runNpm(args, cwd = root) {
  const npmCli = process.env.npm_execpath;
  const result = npmCli
    ? spawnSync(process.execPath, [npmCli, ...args], { cwd, stdio: "inherit" })
    : spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", args, {
        cwd,
        stdio: "inherit",
        shell: process.platform === "win32",
      });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `npm ${args.join(" ")} failed. Fix the error above and run it again.`,
    );
}

// Node's built-in parser: .env.local first, then .env. Values already in the
// environment always win, so a supplied DATABASE_URL is never overridden.
export async function loadEnvironment(cwd = root) {
  for (const name of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(resolve(cwd, name));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

export function availablePostgresPort() {
  return new Promise((accept, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, () => {
      const selected = server.address().port;
      server.close(() => accept(selected));
    });
  });
}

export async function prepareEnvironment(cwd = root) {
  await loadEnvironment(cwd);
  const additions = {};
  if (!process.env.BETTER_AUTH_SECRET)
    additions.BETTER_AUTH_SECRET = randomBytes(32).toString("hex");
  if (!process.env.DATABASE_URL) {
    const local = {
      POSTGRES_USER: process.env.POSTGRES_USER || "starter",
      POSTGRES_PASSWORD:
        process.env.POSTGRES_PASSWORD || randomBytes(24).toString("hex"),
      POSTGRES_DB: process.env.POSTGRES_DB || "starter",
      POSTGRES_PORT:
        process.env.POSTGRES_PORT || String(await availablePostgresPort()),
      COMPOSE_PROJECT_NAME:
        process.env.COMPOSE_PROJECT_NAME ||
        `ngodingpakeai-pg-${randomBytes(6).toString("hex")}`,
    };
    if (
      !/^\d+$/.test(local.POSTGRES_PORT) ||
      Number(local.POSTGRES_PORT) < 1 ||
      Number(local.POSTGRES_PORT) > 65535
    )
      throw new Error("POSTGRES_PORT must be between 1 and 65535.");
    for (const [key, value] of Object.entries(local))
      if (!process.env[key]) additions[key] = value;
    additions.DATABASE_URL = localDatabaseUrl(local);
  }
  databaseUrl(process.env.DATABASE_URL || additions.DATABASE_URL);
  const envFile = resolve(cwd, ".env.local");
  if (Object.keys(additions).length) {
    // Generated values are hex, digits, or URL-encoded, so plain quoting is
    // exact. Node's parser does not expand or unescape inside quotes.
    const lines = Object.entries(additions)
      .map(([key, value]) => {
        if (/["\n\r]/.test(value))
          throw new Error(`${key} cannot contain quotes or line breaks.`);
        return `${key}="${value}"`;
      })
      .join("\n");
    writeFileSync(envFile, `\n${lines}\n`, { flag: "a", mode: 0o600 });
    Object.assign(process.env, additions);
    console.log(
      "Prepared missing local environment settings. Existing values were preserved.",
    );
  } else if (!existsSync(envFile) && !existsSync(resolve(cwd, ".env"))) {
    writeFileSync(
      envFile,
      "# Configuration is supplied by the environment.\n",
      { mode: 0o600 },
    );
  }
}
