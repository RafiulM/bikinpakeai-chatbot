---
name: dev-database
description: Start, inspect, stop, or troubleshoot this starter's local PostgreSQL development database through Docker Compose while preserving its data.
---

Read `docs/local-development.md` and `scripts/database.mjs`. The TanStack Start app runs on the host; `compose.dev.yaml` runs only PostgreSQL. Use npm wrappers so environment-file precedence and the saved Compose project name are applied consistently.

- First run with missing dependencies: `npm run setup`. With dependencies installed, `npm run db:up` also generates missing local settings and waits for database health; follow with `npm run db:migrate` and `npm run doctor`.
- Inspect: `npm run db:status`, then `npm run doctor`. For a startup error, use `npm run db:logs` for bounded recent logs. Logs may contain application data; summarize the relevant error instead of pasting them into documentation tools.
- Stop when requested: `npm run db:down`. It keeps the named volume. `npm run db:up` reconnects the same volume. Normal development should leave the database running.

The generated `COMPOSE_PROJECT_NAME`, credentials, port, and URL belong together. Preserve them on retries and when moving the folder. Changing the project name selects a different volume; changing an environment password does not rotate a role's existing password. For an occupied saved port, change `POSTGRES_PORT` and only the corresponding port in the managed `DATABASE_URL` together, then run `db:up` and `doctor` again. Never delete volumes or regenerate credentials to repair connectivity or migrations.

A supplied external `DATABASE_URL` skips Docker startup. Do not switch it to a local database or modify external services as a repair. An optional `MIGRATION_DATABASE_URL` takes precedence for migrations. A missing table calls for migration, not a reset.

If Docker is installed but stopped, start the existing local Docker app/service when the environment permits, wait for its engine, and retry. If Docker is absent or startup needs user interaction, name that single prerequisite in plain language and continue independent feature work. Do not provision a hosted service or repeatedly retry an unchanged failure.

Use Context7 per `AGENTS.md` before changing Compose or library-specific behavior. For changes to the setup flow, run `npm run test:setup`; it exercises a disposable fresh copy, repeated setup, and persistence across container recreation. Never point this check at the user's database.
