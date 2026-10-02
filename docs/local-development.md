# Local development database

Open this folder in your AI editor and describe the app you want:

> Build a personal reading list with accounts. Set up this project, run it, and let each person manage their own books.

`AGENTS.md` tells the agent to handle setup before continuing your feature. `agent.md` points to the same instructions. The project skills provide setup, database troubleshooting, feature-building, and derivative workflows.

## What runs where

`compose.dev.yaml` runs PostgreSQL 17. The TanStack Start app runs on your computer through Vite for normal development and hot reload. You need Node.js 22.12+ and Docker with Compose v2; Docker Desktop includes both the engine and Compose.

```sh
npm run setup
npm run dev
```

Setup installs pinned dependencies, generates missing private settings in ignored `.env.local`, chooses a free database port, creates a unique Compose project and persistent volume, waits for PostgreSQL health, applies committed Drizzle migrations, and checks the result. It can be repeated without changing credentials or deleting records. If Docker is not running, the script gives a specific message; start Docker and retry.

The agent can use `npm run predev` then `npm run doctor` when dependencies already exist. `npm run dev` also runs preparation automatically. If the browser uses a different port, `BETTER_AUTH_URL` must match the actual app origin. Database and app ports are separate.

## Database commands

| Command              | Result                                                                   |
| -------------------- | ------------------------------------------------------------------------ |
| `npm run db:up`      | Generate missing local settings and start PostgreSQL; wait until healthy |
| `npm run db:status`  | Show this copy's running or stopped database container                   |
| `npm run db:logs`    | Show the last 80 database log lines without following indefinitely       |
| `npm run db:down`    | Remove this copy's container and network, keeping its data volume        |
| `npm run db:migrate` | Apply committed migrations                                               |
| `npm run doctor`     | Verify connection, auth tables, and project tooling files                |

Use these commands instead of bare `docker compose up`: the wrappers load `.env.local` and `.env` with the same precedence as the app and apply the saved project name. The database listens only on `127.0.0.1`, using a generated high port recorded in `.env.local`. Each fresh derivative has its own project, password, port, and volume.

Preserve `.env.local` across restarts. Do not delete the volume to fix a password or migration error. If a saved port becomes occupied, update both `POSTGRES_PORT` and the port in the managed `DATABASE_URL`, then run `db:up` again. Changing the environment password does not change an existing database role's password.

## Existing PostgreSQL connections

If you set `DATABASE_URL` before setup, the script keeps it and skips Docker. Use a database dedicated to your app. `MIGRATION_DATABASE_URL` is optional for a separate direct connection. The local container status/log/stop commands do not operate on external databases; use `npm run doctor` to check their connection.

## Verify a fresh start

```sh
npm run test:setup
```

This integration check creates a temporary source copy with no dependencies or environment file, runs setup, stores a marker, repeats setup, recreates the database container, and confirms the marker survived. It removes only its own temporary copy and generated Docker volume. Docker and package registry access are required. The main project's environment and database are never used.
