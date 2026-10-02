# Creating derivatives

The PostgreSQL base is maintained at the repository root. Each derivative is an independent app copied from a known `baseVersion`. There is no runtime plugin framework and no dashboard/chatbot package in the base.

```sh
npm run create:variant -- dashboard ../my-dashboard
```

Open the new folder, run `npm run setup`, then `npm run dev`. The command copies the source, both Compose files, and lockfile, changes app/package identity, and writes `docs/variant.md`. It **does not build dashboard features**.

The destination must not exist; its parent folder must exist. It must be outside the base folder. The copier includes only maintained source paths. It skips symlinks, environment secrets, databases, node_modules, Git history, build output, and local editor settings. A new setup creates fresh credentials and PostgreSQL data. Local variants running together need different POSTGRES_PORT values and matching DATABASE_URL ports. Add new reusable source paths to the copier's allowlist when the base gains them.

## Dashboard recipe

Use the `create-variant` skill and describe the dashboard's audience and data. A useful first slice might include a sidebar shell, a real user-owned entity, list/create/edit flows, and summaries derived from that entity. Keep navigation and tables inside the derivative. Do not invent numbers or add charts before the data exists.

## Chatbot recipe

Create a `chatbot` derivative and choose a model provider. Add its current SDK, server-only credentials, a streaming route, and a conversation UI. Authenticate requests and constrain conversation/message queries to the current user. Add error/cancellation behavior and usage limits appropriate to the product. Keep paid API calls and provider dependencies out of the base.

## Keeping the family maintainable

- Preserve `baseVersion` as the version the derivative came from.
- Record derivative-specific changes in `docs/variant.md` and rewrite its README for its audience.
- Test the same base auth/setup contract plus the derivative's primary workflow.
- Review and port future base changes deliberately; generated copies do not update automatically.
- Extract a shared package only after multiple real derivatives demonstrate a stable shared boundary.
