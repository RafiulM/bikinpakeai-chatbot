import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { root } from "./lib.mjs";

const mode = process.argv[2];
if (!["unit", "e2e"].includes(mode))
  throw new Error("Use npm test or npm run test:e2e.");
const project = `starter-pg-test-${randomBytes(8).toString("hex")}`;
const password = randomBytes(24).toString("hex");
const dockerArgs = ["compose", "-p", project, "-f", "compose.test.yaml"];
const env = { ...process.env, STARTER_TEST_PASSWORD: password };
let active;
let interrupted = false;
function interrupt() {
  interrupted = true;
  active?.kill("SIGTERM");
}
process.once("SIGINT", interrupt);
process.once("SIGTERM", interrupt);

async function run(command, args, childEnv = env, capture = false) {
  if (interrupted) throw new Error("Tests interrupted.");
  return new Promise((accept, reject) => {
    let output = "";
    active = spawn(command, args, {
      cwd: root,
      env: childEnv,
      stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
    });
    if (capture)
      active.stdout.on("data", (chunk) => {
        output += chunk;
      });
    active.once("error", reject);
    active.once("close", (code) => {
      active = undefined;
      if (code === 0 && !interrupted) accept(output);
      else
        reject(
          new Error(`${command} exited with status ${code ?? "interrupted"}.`),
        );
    });
  });
}

try {
  console.log(
    "Starting an isolated PostgreSQL test server. The app database is not used.",
  );
  await run("docker", [
    ...dockerArgs,
    "up",
    "-d",
    "--wait",
    "--wait-timeout",
    "60",
    "postgres",
  ]);
  const address = await run(
    "docker",
    [...dockerArgs, "port", "postgres", "5432"],
    env,
    true,
  );
  const port = address.trim().match(/^127\.0\.0\.1:(\d+)$/)?.[1];
  if (!port)
    throw new Error("Could not determine the isolated PostgreSQL port.");
  const url = `postgresql://starter_test:${password}@127.0.0.1:${port}/starter_test`;
  const testEnv = {
    ...env,
    DATABASE_URL: url,
    MIGRATION_DATABASE_URL: url,
    STARTER_TEST_DATABASE_URL: url,
    STARTER_TEST_RUN: project,
    BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
    BETTER_AUTH_URL: "http://localhost:3101",
  };
  await run(process.execPath, ["scripts/migrate.mjs"], testEnv);
  if (mode === "unit") {
    const files = readdirSync(resolve(root, "tests"))
      .filter((file) => file.endsWith(".test.mjs"))
      .map((file) => `tests/${file}`);
    await run(process.execPath, ["--test", ...files], testEnv);
  } else {
    await run(
      process.execPath,
      [resolve(root, "node_modules/@playwright/test/cli.js"), "test"],
      testEnv,
    );
  }
} catch (error) {
  console.error(
    `Tests stopped: ${error.message} Start Docker Desktop if needed.`,
  );
  process.exitCode = interrupted ? 130 : 1;
} finally {
  // This generated project owns only this run's disposable test server.
  const result = spawnSync(
    "docker",
    [...dockerArgs, "down", "--volumes", "--remove-orphans"],
    { cwd: root, env, stdio: "inherit" },
  );
  if (result.error || result.status !== 0) {
    console.error(
      `Test cleanup failed. Remove the disposable Docker Compose project ${project} after checking Docker.`,
    );
    process.exitCode = 1;
  }
}
