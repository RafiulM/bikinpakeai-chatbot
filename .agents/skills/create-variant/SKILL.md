---
name: create-variant
description: Create an independent dashboard, chatbot, or other derivative of this TanStack Start + PostgreSQL base starter while preserving the shared setup, authentication, UI, and AI conventions.
---

Read `docs/derivatives.md` and `AGENTS.md`. Determine the derivative name and first useful capability from the request. The base intentionally contains no dashboard or chatbot product features.

Run `npm run create:variant -- <slug> <destination>`. The destination must not exist and must be outside the source tree. The copier uses an explicit source allowlist, skips symlinks and local runtime state, and never copies `.env.local` or databases. It sets starter identity and package metadata while retaining `baseVersion`.

Work in the new destination. Run `npm run setup` there to generate independent credentials and a fresh PostgreSQL database. Keep `compose.dev.yaml`, `compose.test.yaml`, `AGENTS.md`, `agent.md`, and all four project skills in the copy. The next agent should be able to set it up from an ordinary first feature prompt. Give simultaneously running local variants different POSTGRES_PORT values; keep DATABASE_URL in sync. Use the build-feature workflow for the requested capability. Preserve auth and tooling unless the derivative explicitly needs a change.

A dashboard can add navigation, actual domain tables, and authenticated queries. A chatbot needs a user-selected provider before paid API calls; add server-only credentials and enforce conversation ownership. Consult provider docs through Context7. Do not invent analytics or simulate an AI reply as a real provider response.

Update the derivative README and change record with its purpose and differences. Run its checks and production build; verify the primary flow. The copier scaffolds a derivative; it does not implement its product features. Report exactly which steps are complete.
