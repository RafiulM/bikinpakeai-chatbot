# Base TanStack Postgres — ngodingpakeai starters

The TanStack Start + PostgreSQL edition of the base starter: **TanStack Start (Vite + Nitro), Drizzle ORM, PostgreSQL, Better Auth, Tailwind CSS, shadcn/ui, and Motion**. It includes working accounts, a blank protected app, an authenticated Notes API demonstrating the backend standard, project skills, and Context7 configuration.

This is an independent starter. Use it as the foundation for your dashboard, chatbot, or another app.

## Start here

Install **Node.js 22.12 or newer** and **Docker Desktop**, then start Docker Desktop. Open this project folder in your AI editor and prompt:

> Build a personal reading list with accounts. Set up this project, run it, and let each person manage their own books.

The agent instructions make local setup part of the first app-building prompt, then continue your feature. No separate database setup prompt is needed. See [the first-run workflow](docs/local-development.md).

Or run inside this folder:

```sh
npm run setup
npm run dev
```

Open [localhost:3000](http://localhost:3000); it sends you to sign-in, where you create your own account.

Setup installs pinned dependencies, generates a private auth secret and database password, starts PostgreSQL 17 through `compose.dev.yaml` in Docker, waits for it to be healthy, applies migrations, and checks the connection. Values live in ignored `.env.local`; repeated setup preserves existing values and database records.

The database is published only on loopback. Fresh setup selects an available high port and records it in `.env.local`. Its data lives in a named Docker volume. Each fresh copy gets a unique Compose project name and its own credentials. To stop it while keeping data, run `npm run db:down`; `npm run db:up` starts it again. Different local copies need different `POSTGRES_PORT` values if running simultaneously.

## Already have PostgreSQL?

Set a connection string in `.env.local` **before** running setup:

```dotenv
DATABASE_URL=postgresql://user:password@host:5432/database
```

Then run the same setup and dev commands. A supplied connection bypasses Docker and migrations target that database. Use a database dedicated to this app. Follow your provider's TLS requirements; never disable certificate checks to make a connection work.

If your provider supplies separate pooled and direct connections, use the pooled URL for `DATABASE_URL` and the direct URL for `MIGRATION_DATABASE_URL`. Migration commands prefer the latter. Do not commit either URL.

## Build with a prompt

Enable Context7 once in your editor; see [AI editor setup](docs/ai-workflow.md). Then try:

> Read AGENTS.md and use build-feature. Create a personal reading list. Let me add books, mark them finished, and delete them. Each account should only see its own books. Use Drizzle with PostgreSQL and Context7 for current documentation. Build the smallest working version and test it.

No model API key is required by the app. The AI integration supports your coding workflow; runtime chatbot features belong in a derivative.

## What is included

| Area           | Included                                                                     |
| -------------- | ---------------------------------------------------------------------------- |
| App            | TanStack Start file routes, Vite, Nitro node server, strict TypeScript       |
| Data           | Drizzle ORM, node-postgres connection pool, PostgreSQL migrations            |
| Local database | PostgreSQL 17 in Docker, persistent volume, random credentials, healthcheck  |
| Accounts       | Better Auth signup/signin/signout, real server-side sessions                 |
| Roles          | Better Auth access control, permission-guarded API routes and admin page     |
| UI             | Tailwind v4, shadcn/ui primitives, Lucide icons, Motion with reduced motion  |
| AI workflow    | AGENTS.md + agent.md, four project skills, Context7 configs for four editors |
| Quality        | Lint, types, formatting, real PostgreSQL tests, browser auth tests, CI       |
| Derivatives    | Safe source copier retaining PostgreSQL tooling and base version metadata    |

## Backend example

The [Notes API](docs/backend.md) demonstrates the standard: **API routes → Better Auth session checks and validation → services → Drizzle/PostgreSQL**. It supports real CRUD with per-account ownership. Database queries live in `src/services/`; each Drizzle table lives in its own file under `src/db/schema/`. The feature-building skill follows this structure for future prompts.

The same doc covers **role-based access**: `src/lib/permissions.ts` declares resources and roles, `/api/admin/notes` and `/admin` are guarded by permissions rather than a session alone, and `npm run role:set -- you@example.com admin` promotes an account. Signup can never set a role.

## Commands

| Command                       | What it does                                                             |
| ----------------------------- | ------------------------------------------------------------------------ |
| `npm run setup`               | Install, configure, start local PostgreSQL if needed, migrate, diagnose  |
| `npm run dev`                 | Prepare the database and start the development app                       |
| `npm run db:up`               | Start this copy's local PostgreSQL; skip for an external connection      |
| `npm run db:status`           | Inspect this copy's database container                                   |
| `npm run db:logs`             | Read the last 80 database log lines                                      |
| `npm run test:setup`          | Verify a fresh setup, retries, and data persistence in a disposable copy |
| `npm run db:down`             | Stop local containers while preserving the volume                        |
| `npm run doctor`              | Check config, database connection, auth tables, and AI files             |
| `npm run db:generate`         | Generate migration SQL after a schema edit                               |
| `npm run db:migrate`          | Apply committed migrations                                               |
| `npm run role:set`            | Grant a role: `npm run role:set -- you@example.com admin`                |
| `npm run db:studio`           | Inspect the database with Drizzle Studio                                 |
| `npm run check`               | Lint, typecheck, and tests against disposable PostgreSQL                 |
| `npm run build` / `npm start` | Build and serve the production app                                       |
| `npm test`                    | Run setup, copying, and real PostgreSQL migration tests                  |
| `npm run test:e2e`            | Run browser tests against a separate PostgreSQL container                |
| `npm run format`              | Format source and docs                                                   |

Tests require Docker even if your app uses a hosted database. They launch a unique disposable PostgreSQL server, inject its URL into the test processes, and remove it afterward. Your app database is never used. Browser tests use port **3101** against the production build in `.output`; first run `npx playwright install chromium`, then `npm run build`.

## Customize and extend

- Identity: `starter.config.json` and `src/config/site.ts`.
- Your first feature: replace the placeholder in `src/routes/_protected/app.tsx` (the root `/` only redirects there). `npm run doctor` reminds you until it is gone.
- UI tokens: `src/styles/globals.css`.
- Tables: `src/db/schema/` (export tables from `index.ts`); use `pgTable`, PostgreSQL booleans, and timestamps.
- Add UI primitives: `npx shadcn@4.21.0 add dialog`.
- Create another derivative: `npm run create:variant -- dashboard ../my-dashboard`.

See [architecture](docs/architecture.md), [derivatives](docs/derivatives.md), [prompts](docs/prompts.md), and [changes from the Next.js base](docs/variant.md).

## Hosting

Use a Node.js-compatible host and persistent PostgreSQL service. Set private `DATABASE_URL`, `BETTER_AUTH_SECRET`, and public `BETTER_AUTH_URL` settings. Apply migrations once per release, then build and start. The app itself does not need a persistent database file. For serverless or multiple instances, use an appropriate database pooler and connection limits. See [deployment](docs/deployment.md).

For container hosts, `Dockerfile` builds the app (`docker build -t my-app .`) and a release migration job (`docker build --target migrator -t my-app-migrate .`). It is for production only; local development still uses `npm run dev` with `compose.dev.yaml`.

Email verification, password recovery email, social login, billing, and AI provider calls are not configured. Add only the services your product needs.

## Troubleshooting

- **Docker not found / cannot connect:** install and start Docker Desktop, then run setup again.
- **Your saved database port is occupied:** before first setup, optionally set `POSTGRES_PORT=5434` in `.env.local`. For an existing local setup, update both `POSTGRES_PORT` and the port inside `DATABASE_URL`, then restart the database.
- **Database password rejected:** verify your private settings. Changing `POSTGRES_PASSWORD` does not change a password inside an existing Docker volume. Restore the original value or deliberately rotate the database credential; do not delete the volume to fix it.
- **App port changed:** set `BETTER_AUTH_URL=http://localhost:3001` in `.env.local`, then run `npm run dev -- --port 3001`.
- **Missing auth tables:** run `npm run db:migrate`.
- **Connection fails:** run `npm run doctor`. Check the URL, network rules, TLS, and credentials. Connection strings are kept out of diagnostic output.

MIT. See [LICENSE](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md).
