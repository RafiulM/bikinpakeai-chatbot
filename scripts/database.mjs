import { spawnSync } from "node:child_process";
import {
  root,
  loadEnvironment,
  prepareEnvironment,
  assertNode,
} from "./lib.mjs";
import { databaseUrl, managesLocalDatabase } from "./postgres.mjs";

try {
  assertNode();
  const action = process.argv[2];
  const commands = {
    up: ["up", "-d", "--wait", "--wait-timeout", "60", "postgres"],
    down: ["down"],
    status: ["ps", "--all", "postgres"],
    logs: ["logs", "--no-color", "--tail", "80", "postgres"],
  };
  if (!Object.hasOwn(commands, action))
    throw new Error("Use npm run db:up, db:down, db:status, or db:logs.");

  // db:up also works before first setup when dependencies are installed.
  if (action === "up") await prepareEnvironment();
  else await loadEnvironment();
  databaseUrl();

  if (!managesLocalDatabase()) {
    if (action !== "up")
      throw new Error(
        "This connection is not managed by this starter. Use npm run doctor to check it; container commands only manage this copy's local database.",
      );
    console.log(
      "Using your supplied PostgreSQL connection; Docker is not required.",
    );
  } else {
    const compose = spawnSync("docker", ["compose", "version"], {
      stdio: "ignore",
      timeout: 10000,
    });
    if (compose.error || compose.status !== 0)
      throw new Error(
        "Docker with Compose v2 is required. Install Docker Desktop (or Docker Engine with the Compose plugin), start it, then retry this command.",
      );
    const daemon = spawnSync("docker", ["info"], {
      stdio: "ignore",
      timeout: 10000,
    });
    if (daemon.error || daemon.status !== 0)
      throw new Error(
        "Docker is installed but its engine is not reachable. Start Docker Desktop or your Docker daemon and check this terminal's Docker access, then retry. Existing settings and data are kept.",
      );
    const result = spawnSync(
      "docker",
      [
        "compose",
        "--project-name",
        process.env.COMPOSE_PROJECT_NAME,
        "-f",
        "compose.dev.yaml",
        ...commands[action],
      ],
      { cwd: root, env: process.env, stdio: "inherit" },
    );
    if (result.error || result.status !== 0)
      throw new Error(
        "Database command failed. Check npm run db:status and npm run db:logs, and check POSTGRES_PORT for a port conflict. Existing data is kept.",
      );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
