import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createVariant } from "./create-variant.mjs";

const parent = mkdtempSync(resolve(tmpdir(), "starter-first-run-"));
const target = resolve(parent, "app");
const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (
    /^(POSTGRES_|COMPOSE_|BETTER_AUTH_|STARTER_TEST_|PG)/.test(key) ||
    [
      "DATABASE_URL",
      "MIGRATION_DATABASE_URL",
      "NODE_ENV",
      "__NEXT_PROCESSED_ENV",
    ].includes(key)
  )
    delete env[key];
}
let active;
let interrupted = false;
function interrupt() {
  interrupted = true;
  active?.kill("SIGTERM");
}
process.once("SIGINT", interrupt);
process.once("SIGTERM", interrupt);

async function run(command, args) {
  if (interrupted) throw new Error("First-run check interrupted.");
  return new Promise((accept, reject) => {
    active = spawn(command, args, { cwd: target, env, stdio: "inherit" });
    active.once("error", reject);
    active.once("close", (code) => {
      active = undefined;
      if (code === 0 && !interrupted) accept();
      else
        reject(
          new Error(
            `First-run check command exited with status ${code ?? "interrupted"}.`,
          ),
        );
    });
  });
}

async function npm(script) {
  // npm supplies its CLI path on macOS, Linux, and Windows.
  if (!process.env.npm_execpath)
    throw new Error("Run this check with npm run test:setup.");
  await run(process.execPath, [process.env.npm_execpath, "run", script]);
}

async function checkData(seed = false) {
  const source = `
    import assert from 'node:assert/strict';
    import { Pool } from 'pg';
    import { loadEnvironment } from './scripts/lib.mjs';
    await loadEnvironment();
    const pool = new Pool({connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000});
    try {
      ${seed ? "await pool.query('CREATE TABLE setup_marker (value text PRIMARY KEY)'); await pool.query('INSERT INTO setup_marker VALUES ($1)', ['persisted']);" : ""}
      const result = await pool.query('SELECT value FROM setup_marker');
      assert.deepEqual(result.rows, [{value: 'persisted'}]);
      console.log('Saved first-run data is intact.');
    } catch {
      throw new Error('Fresh-copy database persistence check failed.');
    } finally { await pool.end(); }
  `;
  await run(process.execPath, ["--input-type=module", "-e", source]);
}

try {
  createVariant("setup-check", target);
  assert.ok(!existsSync(resolve(target, ".env.local")));
  assert.ok(!existsSync(resolve(target, "node_modules")));
  console.log(
    "Checking a fresh copy with no environment or installed dependencies.",
  );
  await npm("setup");
  const first = readFileSync(resolve(target, ".env.local"), "utf8");
  await checkData(true);
  await npm("setup");
  assert.ok(
    readFileSync(resolve(target, ".env.local"), "utf8") === first,
    "Repeated setup changed private settings.",
  );
  await checkData();
  await npm("db:status");
  await npm("db:down");
  await npm("db:up");
  await npm("doctor");
  await checkData();
  console.log(
    "First-run setup, repeat setup, and database persistence passed.",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = interrupted ? 130 : 1;
} finally {
  const envFile = resolve(target, ".env.local");
  let cleanupOk = true;
  if (existsSync(envFile)) {
    // Only this fresh copy's generated project can be removed by this check.
    const project = readFileSync(envFile, "utf8").match(
      /^COMPOSE_PROJECT_NAME="(ngodingpakeai-pg-[a-f0-9]{12})"$/m,
    )?.[1];
    if (project) {
      const result = spawnSync(
        "docker",
        [
          "compose",
          "--env-file",
          envFile,
          "-p",
          project,
          "-f",
          "compose.dev.yaml",
          "down",
          "--volumes",
        ],
        { cwd: target, env, stdio: "inherit" },
      );
      cleanupOk = !result.error && result.status === 0;
    }
  }
  if (cleanupOk) rmSync(parent, { recursive: true, force: true });
  else {
    console.error(
      `Temporary database cleanup needs Docker access. The disposable copy remains at ${target}.`,
    );
    process.exitCode = 1;
  }
}
