# Agent entrypoint

Read [AGENTS.md](AGENTS.md) before working. It is the canonical instruction file that supported editors discover automatically; this file is an entrypoint for tools or prompts that ask for `agent.md`.

On a first app-building prompt, read [.agents/skills/starter-setup/SKILL.md](.agents/skills/starter-setup/SKILL.md), prepare the local environment, then continue the requested feature. Users do not need to ask for database setup separately.

Database operations and troubleshooting: [.agents/skills/dev-database/SKILL.md](.agents/skills/dev-database/SKILL.md).

Backend features use API routes, Better Auth session checks, validators, services for all queries, and separate Drizzle table files. Read [docs/backend.md](docs/backend.md) and follow the Notes example.
