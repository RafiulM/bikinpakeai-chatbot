# Production image for the TanStack Start app. PostgreSQL is a separate managed
# service: compose.dev.yaml is for local development only and is not used here.
#
#   docker build -t my-app .
#   docker build --target migrator -t my-app-migrate .
#
# Run the migrator once per release, then start the app. compose.prod.yaml
# wires both against an external DATABASE_URL. See docs/deployment.md.

ARG NODE_VERSION=22-slim

# --- Build dependencies ------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# --- Build the server bundle --------------------------------------------------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
# vite build bundles the server without executing it, so no database or auth
# values are needed here. Server code reads process.env when a request arrives.
RUN npm run build

# --- Migrator: apply committed SQL once per release --------------------------
# Uses MIGRATION_DATABASE_URL when set, otherwise DATABASE_URL. Production
# dependencies only: pg and drizzle-orm are all the migration script needs.
# It also carries the role script and the role list it validates against:
#   docker run --rm -e DATABASE_URL=... my-app-migrate \
#     node scripts/set-role.mjs someone@example.com admin
FROM node:${NODE_VERSION} AS migrator
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund
COPY --chown=node:node drizzle ./drizzle
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node src/lib/permissions.ts ./src/lib/permissions.ts
USER node
CMD ["node", "scripts/migrate.mjs"]

# --- Runner: the app. Keep last so it stays the default build target ----------
# Nitro's node-server output is self-contained: no node_modules are copied.
FROM node:${NODE_VERSION} AS runner
LABEL org.opencontainers.image.source="https://github.com/RafiulM/bikinpakeai-chatbot" \
      org.opencontainers.image.description="Bikinpakeai Support Lab: TanStack Start app; needs an external PostgreSQL"
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0
COPY --from=builder --chown=node:node /app/.output ./.output
USER node
EXPOSE 3000

# Liveness only: a static asset, so a database outage does not restart the app.
# GET /api/health is the readiness probe that also checks PostgreSQL.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD \
  node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/icon.svg').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
