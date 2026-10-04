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
# Optional: real model answers instead of local mode (see .env.example).
OPENROUTER_API_KEY=
```

`BETTER_AUTH_SECRET` also encrypts the OpenRouter keys accounts save in Pengaturan. Rotating it signs everyone out and makes saved keys unreadable; owners then save them again.

Keep provider-required TLS settings. Do not disable certificate verification. The example credentials are placeholders, not defaults.

```sh
npm ci
npm run db:migrate
npm run build
npm start
```

Apply migrations once per release. `MIGRATION_DATABASE_URL` takes precedence only for migration/Drizzle tooling; the app uses `DATABASE_URL`. Use a role with schema permissions for migrations and the permissions needed by your application at runtime. Auth migrations contain `public` tables and a Drizzle migration-history schema.

## Docker Compose with an external PostgreSQL

`compose.prod.yaml` runs the production image on any Docker host (a VPS, Coolify's Docker Compose resource, or similar). It builds both Dockerfile targets, runs `migrate` to completion, and only then starts `app`. It never starts a database: point `DATABASE_URL` at a PostgreSQL service you already run (a managed provider, a Coolify PostgreSQL resource, or another host).

First deploy:

```sh
cp .env.production.example .env.production   # fill in real values; never commit it
DC="docker compose -f compose.prod.yaml --env-file .env.production"
$DC up -d --build
$DC logs -f app
```

Every Compose command needs both flags, hence `DC`. Compose refuses to start when `DATABASE_URL`, `BETTER_AUTH_SECRET`, or `BETTER_AUTH_URL` is missing.

Later releases: migrate first, then replace the app, so a failed migration never takes the running app down:

```sh
git pull
$DC build
$DC run --rm migrate && $DC up -d --no-deps app
```

A plain `$DC up -d --build` also works, but when the image changed Compose stops the old app before `migrate` finishes; if the migration then fails, the app stays down until you fix it. Write migrations that the previous release can still run against, since it keeps serving while they apply.

The app publishes on `127.0.0.1:3000` by default (`APP_BIND`, `APP_PORT`). Put a TLS reverse proxy such as Caddy, nginx, or Traefik in front and set `BETTER_AUTH_URL` to the public `https://` origin. Docker-published ports bypass host firewalls like ufw, so only set `APP_BIND=0.0.0.0` when the container must be reachable directly. On Coolify, use the Docker Compose build pack with `/compose.prod.yaml`, assign the domain to the `app` service on port `3000`, and enter the variables in its UI. Coolify reads the `${...}` references and blocks deployment while a `${VAR:?}` value is empty. Keep required references bare: Coolify uses any text after `:?` as the initial value. Two Coolify settings matter for this app:

- **Advanced → Docker compose → Predefined network: Connect to predefined network.** Compose apps get an isolated network by default and cannot reach a PostgreSQL created as a separate Coolify resource. Then use that database's internal URL as `DATABASE_URL`.
- **Advanced → Build → Build arguments: Managed manually in Dockerfile.** The default injects every variable, secrets included, as `ARG`s into each Dockerfile stage, where they end up in image history. This build needs no build arguments.

Promote the first admin after signing up through the app. The migrator image carries the role script:

```sh
$DC run --rm migrate node scripts/set-role.mjs someone@example.com admin
```

To use the demo data, sign in and use **Isi data demo** in Pengaturan. `npm run db:seed` is a local-development helper and is not part of the image.

### Health checks

- The image `HEALTHCHECK` fetches a static asset: liveness only, so a database outage does not restart healthy containers.
- `GET /api/health` is the readiness probe: `200 {"status":"ok","database":true}` when PostgreSQL answers, `503` otherwise. It is public and never includes error details. Point your load balancer or platform health check at it.

### Client IP behind a proxy

Better Auth rate-limits sign-in per client IP. By default it reads `X-Forwarded-For` and trusts it only when it holds a single address, which is what Caddy, Traefik, and Coolify send when they are the only proxy. Otherwise every visitor shares one bucket and the server logs a warning once. Set at most what your setup needs:

- `TRUSTED_PROXIES`: comma-separated IPs or CIDR ranges of your proxies (for example nginx with `$proxy_add_x_forwarded_for`, or a load balancer in front of a proxy). The address chain is read from the right, skipping these hops. List only your proxies, not a private range that also contains clients.
- `IP_ADDRESS_HEADERS`: a header your edge sets and clients cannot forge, such as `cf-connecting-ip` behind Cloudflare. Use it only when the origin accepts Cloudflare traffic alone; otherwise clients can choose their own address.

Keep the app port unreachable except through the proxy (the loopback default above); a directly reachable app lets clients forge `X-Forwarded-For`.

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

The app listens on `PORT` (default `3000`) and `HOST` (default `0.0.0.0`), and runs as the unprivileged `node` user. The `HEALTHCHECK` requests a static asset, so it reports liveness only; use `GET /api/health` for readiness. On `SIGTERM` the server stops accepting connections, gives in-flight requests up to 5 seconds (`SERVER_SHUTDOWN_TIMEOUT`), and exits once idle database connections no longer hold it open.

Rebuild the image for each release. The image holds no data, so scale it horizontally and keep the connection-pool guidance below in mind. Set `ARG NODE_VERSION` to pin a specific Node.js tag.

## Connection pooling

The app uses a shared node-postgres pool with at most five connections per process and a connection timeout. Development hot reloads reuse that pool. Multiple instances multiply the connection count: use your database provider's recommended pooler and tune the pool size to the deployment. Verify your host supports Node.js and TCP PostgreSQL connections. No Edge-specific driver is included.

## Local Docker versus hosted data

`compose.dev.yaml` is a local convenience. It publishes PostgreSQL on loopback only and stores data in a named volume. `npm run db:down` keeps that volume. Do not delete volumes containing data you need.

Use PostgreSQL backups or your provider's backup service and test restoration. Docker volumes are persistence, not backups. On hosted services, setup does not provision a database or purchase resources; supply an existing connection.

Account emails are not verified by the base. Add an email provider for verification and password recovery when needed. Reassess shared auth rate limiting when scaling to multiple app instances.

References: [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql), [node-postgres pooling](https://node-postgres.com/features/pooling), [Better Auth Drizzle adapter](https://better-auth.com/docs/adapters/drizzle), [PostgreSQL Docker image](https://hub.docker.com/_/postgres).
