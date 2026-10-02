# Backend standard

The Notes API is a small, working reference backend. It saves real PostgreSQL rows and uses the existing Better Auth accounts. It has no seeded users, mock sessions, or fabricated responses. Use the same structure for new features.

```text
HTTP request
  → src/routes/api/notes/index.ts or notes/$id.ts
  → withApiSession: Better Auth session and mutation origin check
  → src/validators/notes.ts: validate JSON, parameters, and query strings
  → src/services/notes.service.server.ts: domain operations and Drizzle queries
  → src/db/schema/notes.ts: PostgreSQL table
```

## Responsibilities

- **Routes** own HTTP: authenticate, parse/validate, call a service, and choose response status. Application routes do not query Drizzle or PostgreSQL directly.
- **Services** own application rules and database queries. They receive the verified session's user ID as a separate argument. Every user-owned read, update, and delete filters by it in SQL. Updates/deletes use one scoped statement, avoiding a separate ownership check that could race. Services never accept a request, return a Response, redirect, or read cookies.
- **Validators** define allowed input and inferred TypeScript types. Strict schemas reject unknown fields, including submitted owner IDs. PATCH requires at least one editable field. Database IDs and query parameters are validated before queries.
- **Schemas** define tables, indexes, defaults, and relationships. Each table has its own file; `src/db/schema/index.ts` exports them all for Drizzle Kit, the pool, and Better Auth. Table files import dependencies directly from sibling files, avoiding circular barrel imports.
- **Shared HTTP helpers** in `src/lib/api.server.ts` provide session checks, JSON parsing, errors, and private response caching. Better Auth's own `/api/auth/*` handler stays delegated to Better Auth and its Drizzle adapter.

Authenticate every entrypoint before calling a service. `withApiSession` performs an authoritative Better Auth lookup and returns JSON 401 for an absent, expired, or revoked session. A protected layout is not API authorization. If a page needs a service for its initial render, guard the route in `beforeLoad` and call a server function from its loader, as `src/routes/_protected/admin.tsx` does; browser operations use API routes. Do not put SQL into a route file or introduce a parallel server-function mutation flow for ordinary app features.

## Notes endpoints

| Method | Path                           | Result                                            |
| ------ | ------------------------------ | ------------------------------------------------- |
| GET    | `/api/notes?limit=20&offset=0` | 200, current user's notes and pagination metadata |
| POST   | `/api/notes`                   | 201, creates a note and returns a Location header |
| GET    | `/api/notes/:id`               | 200, a single owned note                          |
| PATCH  | `/api/notes/:id`               | 200, changes title and/or content                 |
| DELETE | `/api/notes/:id`               | 204, no response body                             |

All endpoints require the Better Auth session cookie. POST/PATCH accept `Content-Type: application/json`. Every mutation, including DELETE, requires an `Origin` header matching `BETTER_AUTH_URL`; browsers send it for same-origin fetches. Command-line clients must set it explicitly. Cross-site mutations are rejected even with a valid cookie. Better Auth's CSRF checks cover its own endpoints; the helper protects these application endpoints separately.

Create input: `{ "title": "My first note", "content": "Optional text" }`. Title is trimmed and must contain 1–160 characters; content is at most 10,000 characters and defaults to an empty string. IDs are UUIDs. List `limit` is 1–100 (default 20); `offset` is 0–1,000,000 (default 0). Results sort newest first, then by ID for stable ordering. Offset pagination is deliberately simple for this example; concurrent writes can shift pages.

Single-item responses wrap a note in `data`. Each note contains `id`, `title`, `content`, `createdAt`, and `updatedAt`; timestamps serialize as ISO strings. Lists return `{ "data": [...], "meta": { "limit", "offset", "hasMore" } }`. Owner IDs and auth records are not part of these responses.

Errors use `{ "error": { "code": "...", "message": "..." } }`, with field `details` for validation errors. Statuses are 400 for malformed JSON, 401 for missing/invalid sessions, 403 for rejected origins, 404 for missing or unowned records, 415 for unsupported content types, 422 for invalid input, and 500 for unexpected failures. Missing and unowned records have identical responses. Database exceptions and private values are not returned. Application API responses use `Cache-Control: private, no-store`.

## Role-based access

Ownership answers "is this row mine?". Roles answer "may this account reach past its own rows?". The starter ships a worked example of the second question using the Better Auth admin plugin.

```text
src/lib/permissions.ts     statement (resources → actions) and roles built from it
src/lib/auth.server.ts     admin({ ac, roles, defaultRole, adminRoles })
src/lib/auth-client.ts     adminClient({ ac, roles }) for UI-only checks
src/lib/session.ts         hasPermissionFn for route beforeLoad / loader
src/lib/api.server.ts      withApiPermission for API routes
```

A statement lists every resource and the actions it allows. A role is a subset. Name actions for the extra reach they grant, because owners already reach their own rows through the session:

```ts
export const statement = {
  ...defaultStatements, // Better Auth's own user and session management
  notes: ["read-any", "delete-any"],
} as const;

export const ac = createAccessControl(statement);

export const roles = {
  user: ac.newRole({ notes: [] }),
  admin: ac.newRole({
    ...adminAc.statements,
    notes: ["read-any", "delete-any"],
  }),
};
```

Roles live in `user.role` as a string; a comma-separated list such as `admin,support` grants the union. Signup cannot set it — the column is `input: false` — so an account can never promote itself. Every new account gets `defaultRole`.

Grant a role to an existing account:

```sh
npm run role:set -- someone@example.com admin
```

Guard the server, in both places:

```ts
// API route: 401 without a session, 403 without the permission.
export const Route = createFileRoute("/api/admin/notes/")({
  server: {
    handlers: {
      GET: ({ request }) =>
        withApiPermission(request, { notes: ["read-any"] }, async () =>
          Response.json(await listAnyNotes({ limit: 20, offset: 0 })),
        ),
    },
  },
});

// Page: renders not-found, so the route stays invisible.
export const Route = createFileRoute("/_protected/admin")({
  beforeLoad: async () => {
    if (!(await hasPermissionFn({ data: { notes: ["read-any"] } })))
      throw notFound();
  },
});
```

Both helpers read the stored role, so revoking a role takes effect on the next request rather than when the session expires. Hiding a link with `hasPermissionFn` or the client's `authClient.admin.checkRolePermission` is presentation only; it never replaces the server check.

| Method | Path                   | Result                                                   |
| ------ | ---------------------- | -------------------------------------------------------- |
| GET    | `/api/admin/notes`     | 200, every account's notes plus `ownerName`/`ownerEmail` |
| DELETE | `/api/admin/notes/:id` | 204, deletes any account's note                          |

Cross-account service functions carry an `Any` suffix (`listAnyNotes`, `deleteAnyNote`) because they deliberately skip the ownership filter. They are only safe behind a permission check — never call them from a handler that merely has a session. Ordinary `listNotes`/`deleteNote` stay scoped to the session user even for an admin, so `/admin` and `/app` show different things to the same person.

The admin plugin also adds `banned`, `banReason`, `banExpires`, and `session.impersonatedBy`, plus its own `/api/auth/admin/*` endpoints for user management. Those are guarded by the `user` and `session` actions in `defaultStatements`, which only `admin` holds here.

## Try it

Start the app and create an account or sign in. In that app tab's browser console:

```js
const response = await fetch("/api/notes", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "My first note",
    content: "It is saved in PostgreSQL.",
  }),
});
const result = await response.json();
console.log(result);

await fetch("/api/notes").then((response) => response.json());
```

The browser sends your existing session cookie and origin. Visiting `/api/notes` while signed out returns 401. The example has no Notes UI; it establishes the backend pattern for your app.

## Extend it

1. Create a table file under `src/db/schema/` and export it from `index.ts`. Leave existing auth table names and fields unchanged.
2. Define strict input schemas under `src/validators/`.
3. Add a server-only `*.service.server.ts` under `src/services/` with all domain queries. Require the authenticated user ID for user-owned operations.
4. Add thin server routes under `src/routes/api/` using `withApiSession`, or `withApiPermission` when the endpoint reaches past the caller's own rows, then call them from the frontend.
5. Generate a new migration with `npm run db:generate`, inspect it, and apply with `npm run db:migrate`. Keep SQL and metadata together; do not edit applied migrations.
6. Run `npm run check`, `npm run build`, and `npm run test:e2e`. Add tests for CRUD, rejected input, anonymous access, and cross-account isolation like `e2e/notes.spec.ts`. Tests use their own disposable PostgreSQL server.

Notes is replaceable example functionality. If removing it from a project that has already migrated, remove its routes/service/validator/schema export and generate a new reviewed migration. Do not delete or rewrite historical migrations, or drop saved notes without authorization.
