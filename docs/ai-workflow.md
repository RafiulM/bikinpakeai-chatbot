# Build with your AI editor

The app runs independently of the editor. The AI integration consists of project instructions, four local skills, and a Context7 MCP server configuration. MCP lets your coding assistant fetch documentation through tools.

## Enable once

Open the project folder in your editor and enable/trust the included Context7 connection if prompted. Restart its agent session after changing MCP settings. This repository does not change your global settings or automatically authenticate your editor.

| Editor            | Included files                                        | How to use                                                                                            |
| ----------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Codex             | `AGENTS.md`, `.agents/skills/`, `.codex/config.toml`  | Trust the project so its config loads; check the MCP list. Project skills are discoverable.           |
| Claude Code       | `CLAUDE.md`, `.mcp.json`                              | Enable the project MCP server. CLAUDE.md points to the shared instructions and skills.                |
| Cursor            | `.cursor/mcp.json`, `.cursor/rules/starter.mdc`       | Enable Context7 under Tools & MCP. The rule points to the same skill files.                           |
| VS Code / Copilot | `.vscode/mcp.json`, `.github/copilot-instructions.md` | Start the Context7 server from the MCP configuration. Agent instructions point to the project skills. |

The shared skills are `starter-setup`, `dev-database`, `build-feature`, and `create-variant`. Codex can discover them natively. The other editor instructions ask the assistant to read the relevant file directly, which avoids duplicating skill implementations or claiming every editor has the same discovery behavior.

Try this connection check:

> Use Context7 to resolve Better Auth, then look up the TanStack Start integration for the version in package.json. Tell me which library ID you used.

A tool response proves the connection; the presence of a JSON/TOML file does not. `npm run doctor` checks local configuration files only.

## Access and rate limits

The configs use `https://mcp.context7.com/mcp` without a committed API key. Context7 supports limited anonymous access. If it requests authentication or you hit its limits, use its [client setup guide](https://context7.com/docs/resources/all-clients) to configure personal credentials. OAuth-capable clients can use `https://mcp.context7.com/mcp/oauth` and sign in through the editor. Keep keys in personal settings or environment-backed credentials, not in this template.

For Codex, project MCP configuration requires a trusted project; see the [official MCP documentation](https://developers.openai.com/codex/mcp/). Skill discovery under `.agents/skills` is documented in [official skill guidance](https://developers.openai.com/codex/skills/).

## First prompt

Describe your app normally; you do not need a separate setup prompt. The shared instructions tell the agent to install missing dependencies, prepare local PostgreSQL, apply migrations, verify the preview, and continue your feature. `agent.md` links to the canonical `AGENTS.md` for tools that use the singular filename. See [local development](local-development.md) for the commands and prerequisites.

## A useful build loop

1. Describe the person using the app and the task they need to accomplish.
2. Ask for the smallest useful feature. Include what should be saved and who can see it.
3. Let the assistant inspect the project, select a skill, and fetch current API docs.
4. Try the result in the browser. Describe what should change.
5. Ask the assistant to run the relevant checks and explain the outcome.

Project guidance applies the Context7 resolve-then-query workflow before using library APIs. If the service is unavailable, the assistant should disclose that and use official documentation. It should never upload secrets, private records, or your database to a documentation search.

This makes the development workflow AI-friendly. Runtime chatbot functionality, provider selection, model access, and billing are intentionally left to a chatbot derivative.
