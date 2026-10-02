# TanStack Start + PostgreSQL base

Ported from the Next.js + PostgreSQL base version 0.1.0.

This starter keeps Drizzle with node-postgres, Better Auth with roles, Tailwind v4, shadcn/ui, Motion, Context7, the Notes API contract, the Docker development database, the setup scripts, and the project skills. The framework layer is TanStack Start on Vite with Nitro's node server.

Changes:

- `src/app` (App Router) became `src/routes` (file routes). `_auth.tsx` and `_protected.tsx` are pathless layouts; API routes export `server.handlers`.
- Page guards moved from `requireSession()` in layouts to `beforeLoad` in the layout routes, using the session the root route places in router context. `hasPermissionFn` replaces `requirePermission()`; the admin route throws `notFound()`.
- `import "server-only"` became the `.server.ts` suffix, enforced by TanStack Start import protection. Route files reach server code through server functions in `src/lib/session.ts`.
- Better Auth uses `tanstackStartCookies()` instead of `nextCookies()`.
- Tailwind runs through `@tailwindcss/vite`; the tokens moved to `src/styles/globals.css`.
- Environment files are read by Node's built-in `process.loadEnvFile` instead of `@next/env`; precedence is unchanged (process, `.env.local`, `.env`).
- `npm run build` writes `.output/`; `npm start` runs `node .output/server/index.mjs`, which honors `PORT` and `HOST`. The Dockerfile ships only `.output/` and needs no placeholder values at build time.
- ESLint uses `@eslint/js`, `typescript-eslint`, and `eslint-plugin-react-hooks` directly.

The e2e specs are identical to the Next.js base and pass unchanged; they are the contract shared across the starter family. Dashboard and chatbot product features remain future derivatives.
