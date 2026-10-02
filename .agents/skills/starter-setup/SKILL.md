---
name: starter-setup
description: Prepare this TanStack Start + PostgreSQL starter on the first app-building prompt, or fix first-run dependency, Docker, environment, and migration problems so the user can build immediately.
---

Read `README.md`, `package.json`, and the first-prompt workflow in `AGENTS.md`. Setup is part of a request to build or run the app, even when the user never mentions databases. Keep their requested feature as the objective; continue implementing it after setup.

1. If dependencies are absent, run `npm run setup` from the project root. The script installs the lockfile, generates missing secrets and a database port, starts PostgreSQL using `compose.dev.yaml`, waits for health, migrates, and runs diagnostics. Do not ask users to copy environment files, invent passwords, create tables, or choose a hosting provider for local development.
2. With dependencies installed, run `npm run predev` followed by `npm run doctor`. This handles both a new environment and a stopped existing container without reinstalling packages. Preserve private settings, migrations, and database records.
3. Start `npm run dev` in a persistent terminal if a matching preview is not already running. Verify the actual local URL responds. If the app needs another port, keep `BETTER_AUTH_URL` in sync before starting, for example `http://localhost:3001` with `npm run dev -- --port 3001`. Do not run a duplicate server or report an unverified URL.
4. Continue the requested feature using `build-feature`. Report the working preview and any exact remaining user action in plain language.

Read `.agents/skills/dev-database/SKILL.md` when Docker or the database fails. Starting an existing local Docker installation can be handled by the agent when permitted; installing prerequisites or unlocking a desktop app may require the user's action. Do not repeat an unchanged failed command.

An existing `DATABASE_URL` bypasses Docker. Migrations use `MIGRATION_DATABASE_URL` when supplied. Never overwrite a user's supplied connection, print credentials, or substitute SQLite. See `docs/deployment.md` for hosted connections and TLS.

Use Context7 per `AGENTS.md` for library/tool behavior. Editor activation is separate from app setup: see `docs/ai-workflow.md`. A missing MCP connection does not block local startup; confirm a real documentation-tool response before claiming it works.
