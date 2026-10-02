---
name: build-feature
description: Build or change a feature in this TanStack Start starter, including UI, authenticated API routes, services, and PostgreSQL data while reusing the existing authentication and components.
---

Read `AGENTS.md`, `docs/architecture.md`, `docs/backend.md`, and relevant feature files. On a fresh project, follow the starter-setup skill first, then continue the feature without requiring a separate setup prompt. Infer routine implementation details; clarify product ambiguity only when it changes the outcome. Deliver a usable slice with real behavior, appropriate loading/empty/error states, and readable beginner-facing explanations.

Consult Context7 as described in `AGENTS.md` before relying on library APIs. Inspect installed versions instead of adding a second framework, ORM, auth library, component system, or motion package.

Place pages in `src/routes`; put signed-in screens under `_protected/` so the layout's `beforeLoad` guard applies. Any component may use hooks; there is no server/client component split. Browser data operations use server routes under `src/routes/api/` (`createFileRoute` with `server.handlers`). Follow the Notes routes and `src/services/notes.service.server.ts` as the reference. Server-only code lives in `.server.ts` files; route files reach it only through `createServerFn` handlers.

- Routes authenticate with `withApiSession`, validate inputs using strict schemas under `src/validators/`, call services, and shape HTTP responses. Read dynamic segments from `params` (`$id` in the file name). Return JSON 401 for anonymous users and identical 404 responses for absent/unowned records. Preserve mutation Origin checks and `private, no-store` responses.
- Put all application Drizzle queries and domain rules in server-only `src/services/*.service.server.ts`. Pass the verified session user ID as a separate argument, never from submitted data. Filter every owned read/update/delete in SQL; assign ownership from that argument on creation. Services do not read request cookies, redirect, or construct HTTP responses.
- A route loader may call a server function that wraps one service read, but only under a `beforeLoad` guard (`_protected.tsx`, or `hasPermissionFn` for cross-account reads). Keep domain queries out of route files and handlers. Use API routes for ordinary browser mutations rather than adding a parallel server-function mutation flow.
- Validate request bodies, IDs, and pagination before queries. Reject unknown or owner fields. For partial updates require an editable field. Reuse shared error responses; never return raw database exceptions.

Definition of done for the first feature: the signed-in app page no longer carries the starter's blank canvas. Remove the `data-starter-placeholder` section (and the `CopyPrompt` usage if nothing else needs it), delete `e2e/starter.spec.ts`, and confirm `npm run doctor` prints no placeholder reminder. The root route only redirects; add a public landing page there only if the product needs one. Never ship the placeholder as if it were the app.

Add each table to `src/db/schema/<table>.ts` and export it from `src/db/schema/index.ts`. Import foreign-key dependencies directly from sibling files. Keep Better Auth's core tables intact. Generate, inspect, and apply a new migration. Store only requested data; do not seed demo users or silently delete the Notes example's saved records.

Reuse `src/components/ui`, `cn()`, and CSS tokens. Prefer semantic controls, explicit labels, visible focus, and responsive layouts. Use Motion where helpful and preserve `MotionConfig reducedMotion="user"`.

Validate actual behavior with tests like `e2e/notes.spec.ts`: anonymous access, CRUD persistence, invalid input, cross-account isolation, and revoked sessions. Tests must exercise the real routes and service queries against disposable PostgreSQL. Run the applicable checks in `AGENTS.md`. Update relevant docs and explain what the user can now do. Do not describe simulated interactions as working functionality.

Use pgTable, PostgreSQL boolean columns and timestamps with time zone. All database queries are asynchronous. Preserve the shared connection pool and Better Auth provider pg. Tests run through npm test or npm run test:e2e so they use their own PostgreSQL server.
