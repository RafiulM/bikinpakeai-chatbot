# Hosting the TanStack Start + PostgreSQL starter

Run the app on a Node.js-compatible host connected to a persistent PostgreSQL service. The application's filesystem does not hold your database.

## Production environment

Set private values through your host:

```dotenv
DATABASE_URL=postgresql://user:password@database-host:5432/app
BETTER_AUTH_SECRET=your-random-secret-at-least-32-characters
BETTER_AUTH_URL=https://your-app.example
# Optional direct connection when the runtime URL uses a pooler:
MIGRATION_DATABASE_URL=postgresql://user:password@direct-host:5432/app
```

Keep provider-required TLS settings. Do not disable certificate verification. The example credentials are placeholders, not defaults.

```sh
npm ci
npm run db:migrate
npm run build
npm start
```

Apply migrations once per release. `MIGRATION_DATABASE_URL` takes precedence only for migration/Drizzle tooling; the app uses `DATABASE_URL`. Use a role with schema permissions for migrations and the permissions needed by your application at runtime. Auth migrations contain `public` tables and a Drizzle migration-history schema.

## Docker image

`Dockerfile` builds two targets. The default `runner` target ships `.output/`: Nitro's self-contained node server with every runtime dependency bundled, and nothing else. The `migrator` target installs production dependencies (`pg`, `drizzle-orm`) and adds the committed SQL so a release can migrate before the new app starts.

```sh
docker build -t my-app .
docker build --target migrator -t my-app-migrate .
```

`vite build` bundles the server without running it, so the builder stage needs no database or auth values. Server code validates `process.env` when the first request arrives. Pass real values to the running container; do not put secrets in `--build-arg`, `ENV`, or the image. Only variables prefixed `VITE_` can reach the browser bundle, and the base defines none.

```sh
docker run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  my-app-migrate

docker run -d -p 3000:3000 \
  -e DATABASE_URL="$DATABASE_URL" \
  -e BETTER_AUTH_SECRET="$BETTER_AUTH_SECRET" \
  -e BETTER_AUTH_URL="https://your-app.example" \
  my-app
```

`BETTER_AUTH_URL` must be the origin browsers actually use, including the port. Cookie-authenticated mutations reject any other origin. Behind a proxy or load balancer, set it to the public URL, not the container address.

The app listens on `PORT` (default `3000`) and `HOST` (default `0.0.0.0`), and runs as the unprivileged `node` user. The `HEALTHCHECK` requests a static asset, so it reports liveness only: a database outage will not restart a healthy process. Add your own readiness probe if your platform needs one that checks PostgreSQL.

Rebuild the image for each release. The image holds no data, so scale it horizontally and keep the connection-pool guidance below in mind. Set `ARG NODE_VERSION` to pin a specific Node.js tag.

## Connection pooling

The app uses a shared node-postgres pool with at most five connections per process and a connection timeout. Development hot reloads reuse that pool. Multiple instances multiply the connection count: use your database provider's recommended pooler and tune the pool size to the deployment. Verify your host supports Node.js and TCP PostgreSQL connections. No Edge-specific driver is included.

## Local Docker versus hosted data

`compose.dev.yaml` is a local convenience. It publishes PostgreSQL on loopback only and stores data in a named volume. `npm run db:down` keeps that volume. Do not delete volumes containing data you need.

Use PostgreSQL backups or your provider's backup service and test restoration. Docker volumes are persistence, not backups. On hosted services, setup does not provision a database or purchase resources; supply an existing connection.

Account emails are not verified by the base. Add an email provider for verification and password recovery when needed. Reassess shared auth rate limiting when scaling to multiple app instances.

References: [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql), [node-postgres pooling](https://node-postgres.com/features/pooling), [Better Auth Drizzle adapter](https://better-auth.com/docs/adapters/drizzle), [PostgreSQL Docker image](https://hub.docker.com/_/postgres).
