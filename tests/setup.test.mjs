import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { root } from "../scripts/lib.mjs";
import {
  localDatabaseUrl,
  managesLocalDatabase,
  databaseUrl,
} from "../scripts/postgres.mjs";

function prepare(cwd, overrides = {}) {
  const env = { ...process.env };
  for (const key of [
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "DATABASE_URL",
    "MIGRATION_DATABASE_URL",
    "COMPOSE_PROJECT_NAME",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_DB",
    "POSTGRES_PORT",
    "NODE_ENV",
  ])
    delete env[key];
  const source = `import { prepareEnvironment } from ${JSON.stringify(pathToFileURL(resolve(root, "scripts/lib.mjs")).href)}; await prepareEnvironment(${JSON.stringify(cwd)});`;
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", source],
    { env: { ...env, ...overrides }, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
}

test("first-run setup creates independent local secrets and is repeatable", () => {
  const cwd = mkdtempSync(resolve(tmpdir(), "starter-env-"));
  try {
    prepare(cwd);
    const first = readFileSync(resolve(cwd, ".env.local"), "utf8");
    assert.match(first, /BETTER_AUTH_SECRET="[a-f0-9]{64}"/);
    assert.match(first, /POSTGRES_PASSWORD="[a-f0-9]{48}"/);
    assert.match(first, /DATABASE_URL="postgresql:\/\/starter:/);
    assert.match(first, /COMPOSE_PROJECT_NAME="ngodingpakeai-pg-/);
    prepare(cwd);
    assert.equal(readFileSync(resolve(cwd, ".env.local"), "utf8"), first);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("setup preserves an existing external database and credentials", () => {
  const cwd = mkdtempSync(resolve(tmpdir(), "starter-env-"));
  try {
    const content = `BETTER_AUTH_SECRET=${"x".repeat(48)}\nBETTER_AUTH_URL=http://localhost:4000\nDATABASE_URL=postgresql://someone:private@db.example/existing\n`;
    writeFileSync(resolve(cwd, ".env.local"), content);
    prepare(cwd);
    assert.equal(readFileSync(resolve(cwd, ".env.local"), "utf8"), content);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("process environment credentials are not copied to disk", () => {
  const cwd = mkdtempSync(resolve(tmpdir(), "starter-env-"));
  try {
    const secret = "process-only-credential".repeat(3);
    const url = "postgresql://external:private@db.example/existing";
    prepare(cwd, { BETTER_AUTH_SECRET: secret, DATABASE_URL: url });
    const contents = readFileSync(resolve(cwd, ".env.local"), "utf8");
    assert.ok(!contents.includes(secret));
    assert.ok(!contents.includes(url));
    assert.ok(!contents.includes("POSTGRES_PASSWORD"));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("local setup preserves a custom password containing dotenv expansion characters", () => {
  const cwd = mkdtempSync(resolve(tmpdir(), "starter-env-"));
  try {
    const password = 'special$character#with"quote';
    prepare(cwd, { POSTGRES_PASSWORD: password });
    // An environment-supplied password is not written; subsequent invocations receive it again.
    const first = readFileSync(resolve(cwd, ".env.local"), "utf8");
    assert.ok(first.includes(encodeURIComponent(password)));
    prepare(cwd, { POSTGRES_PASSWORD: password });
    assert.equal(readFileSync(resolve(cwd, ".env.local"), "utf8"), first);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("Docker management applies only to the exact generated local connection", () => {
  const env = {
    COMPOSE_PROJECT_NAME: "test-project",
    POSTGRES_USER: "starter",
    POSTGRES_PASSWORD: "secret",
    POSTGRES_DB: "starter",
    POSTGRES_PORT: "5433",
  };
  env.DATABASE_URL = localDatabaseUrl(env);
  assert.equal(managesLocalDatabase(env), true);
  assert.equal(
    managesLocalDatabase({
      ...env,
      DATABASE_URL: "postgresql://other:password@db.example/app",
    }),
    false,
  );
  assert.equal(databaseUrl(env.DATABASE_URL), env.DATABASE_URL);
  assert.throws(() => databaseUrl("file:app.db"), /PostgreSQL connection/);
  assert.throws(
    () => databaseUrl("postgresql://localhost/"),
    /PostgreSQL connection/,
  );
});
