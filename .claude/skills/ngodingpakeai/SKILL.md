---
name: ngodingpakeai
description: "Connect, index, and sync the current repository with NgodingPakeAI for project memory and safe codebase context, AND work on assigned NgodingPakeAI tasks. Use when the user asks to connect, index, or sync this codebase, pastes a <task> block, or mentions NgodingPakeAI."
---

# NgodingPakeAI — Codebase Sync

NgodingPakeAI is the **project-memory and codebase-context layer** for AI coding agents.
It does NOT replace you — it gives you organized project memory and safe codebase
context through its CLI. When the user asks to **connect, index, or sync** this
repository with NgodingPakeAI, follow this skill.

> The CLI is the security gate. It decides what may leave the machine. You operate
> it; you never upload files yourself or call the HTTP API directly.

## Prerequisites
- Node.js available (the CLI runs via `npx ngodingpakeai …`).
- Workspace ID: `d0e45187-2b74-4a09-8808-e37ee64059c4`
- An access token starting with `ngpk_`. Provide it via the `NGODINGPAKEAI_TOKEN`
  environment variable (preferred) or the `--token` flag on `connect`.
  Create one at https://www.ngodingpakeai.com/settings (API keys). Synced content is viewable at https://www.ngodingpakeai.com/workspace/d0e45187-2b74-4a09-8808-e37ee64059c4.

## How sync works (one mode — YOU write the summaries)
NgodingPakeAI never uploads or stores raw source code. Instead **you**, the
agent, write short natural-language summaries of the code — locally, where you
already have file access — and the CLI uploads only file metadata + those
summaries. The server embeds them for semantic search and codebase chat, then
rolls them up into canonical repository/app/package docs. Every generated doc
keeps the exact contributing file paths and commit as source metadata.

## Existing codebase? The summary sync builds the pending plan for you
There are two safe entry points for an existing codebase:
- When this skill was installed from a Wiki/workspace page, the **Workspace ID
  above is the exact target**. Connect this repo to that workspace and do not
  choose a default workspace, create a new one, or follow another workspace
  link.
- When onboarding starts without a workspace target, the web app prepares an
  empty workspace with one **pending baseline plan** before the agent connects.

After the final summary sync, the
server reads the docs it just built and works BACKWARDS to produce the planning
documents — a PRD, then fitur and sub-fitur — describing the app **as it already
is**. Those fitur are created with status `done` and **no tasks**, because the
code for them already exists.

This means a user with an existing project does NOT have to write a PRD by hand.
They connect, sync once, and the workspace is populated.

## Project started from a template (`ngodingpakeai create`)
When the user began from a template in the web app, the copied prompt ran
`npx ngodingpakeai create --token …`. That command already downloaded the
source, made the first git commit, wrote `.ngodingpakeai/config.json`, and
installed this skill. In that case:
- **Skip `connect`.** The workspace, plan, and repo exist on the server and are
  bound by the config file. Never create another workspace for this folder.
- **Run the project's own setup first.** Templates ship their setup instructions
  (`AGENTS.md` "first prompt" section and/or `.agents/skills/*/SKILL.md`, e.g.
  `starter-setup`). Follow them to install dependencies, prepare the local
  database, and start the dev server — before working any task. Explain each
  step in plain language; the user may never have run a project before.
- The forked plan already describes what the template contains (fitur marked
  `done`). New work comes from the plan's planned fitur via `task next`.
- Commit after each completed task so the user always has a known-good state
  to return to. If something breaks, run `npm run doctor` (or the template's
  equivalent) and the dev-server logs before changing code.

## Reverse state transitions
The server owns the reverse state. Advance it by completing the CLI sync flow;
never edit the database, call the HTTP API directly, or invent a separate state
command. The expected transitions are:

- `waiting`: the prepared plan is waiting for the repository connection or first metadata pass.
- `syncing`: the CLI has started a sync run; wait for `sync` to complete.
- `awaiting_summaries`: `sync --plan` completed, but the agent still needs to write the requested summaries.
- `building_wiki`: the final `sync` uploaded summaries successfully and the server is rebuilding repository documentation.
- `running`: the wiki is ready and the server is generating the reverse PRD and feature inventory.
- `done`: the reverse plan is populated; its features describe existing code and have no implementation tasks.
- `error`: the server could not build the reverse plan; show the printed workspace/plan link and ask the user to retry from the web UI.

For a prepared reverse plan, `sync --plan` moves the flow toward
`awaiting_summaries`; writing `summaries.json` and running the final
`sync` moves it toward `building_wiki`. The server then advances the state
to `running` and `done` asynchronously. Run `status` after sync to confirm
the upload and report the exact link printed by the CLI, but do not poll or
manually mutate reverse state from the agent.

What you must do about it:
- The pending plan row exists before sync starts, but its CONTENTS take ~1–6
  minutes (the server is writing the PRD and reading out the fitur). The CLI
  prints the workspace link — **give that link to the user** and tell them the
  plan is still being assembled. Do not wait/poll for it, and do not re-run sync
  to "make it finish".
- This reverse bootstrap happens ONLY for the prepared pending plan in its
  reserved workspace. If the skill above contains a real Workspace ID from an
  existing Wiki page, keep the sync in that exact workspace; do not redirect it
  to the reserved/default workspace.
- Never try to build the PRD or fitur yourself through the CLI. The server does
  it from the summaries you already wrote.

## Instructions — the sync loop
1. `npx ngodingpakeai doctor` — check environment + connectivity.
2. `npx ngodingpakeai connect --workspace d0e45187-2b74-4a09-8808-e37ee64059c4 --token "$NGODINGPAKEAI_TOKEN"` — link this repo to the workspace (first time only).
3. `npx ngodingpakeai sync --plan` — detects repository apps/packages, scans + uploads file METADATA (paths/hashes only), then writes `.ngodingpakeai/pending.json`: the list of new/changed files that need summaries (already curated — lockfiles/fixtures/barrels are excluded, so no wasted effort).
4. **Write the summaries.** Read each file in `pending.json` and produce `.ngodingpakeai/summaries.json` (format below). Only files in the pending list — unchanged files keep their existing summaries.
5. `npx ngodingpakeai sync` — validates and uploads summaries only. It FAILS with a list if any pending file is missing a summary (fix and re-run; `--allow-missing` skips them only if the user says so). **This final summary pass CLOSES the cycle** — run it only when every task is done (see hard rule 6). The earlier `sync --plan` metadata pass never closes a cycle.
6. `npx ngodingpakeai status` — confirm; then report to the user: files indexed/summarized, warnings, and the exact plan link printed by the CLI. Its canonical shape is `/workspace/<workspaceId>?plan=<planId>`. Do not guess either id.

## summaries.json format
A FLAT JSON object keyed by file path — no wrapper, no `version`, no `files` array:
```json
{
  "src/server/services/plan.service.ts": {
    "summary": "Service layer untuk plan/PRD: CRUD, chat persistence, kompaksi riwayat.",
    "sections": [
      { "symbol": "planService.createPlan", "startLine": 1, "endLine": 120,
        "summary": "Membuat plan baru dari jawaban onboarding; alokasi slug unik." }
    ]
  }
}
```
Field names are exact: `summary`, `sections[]`, and inside a section `symbol` (NOT `symbolName`), `startLine`, `endLine`, `summary`. `sections` is optional.

Rules for good summaries:
- **Bahasa Indonesia**, 1–3 kalimat per summary. Sebut nama simbol, route, dan tabel yang relevan — itu yang membuat pencarian akurat.
- Every summary (file-level AND section-level) must be **10–2000 characters**; the CLI rejects anything outside that before uploading.
- Jelaskan peran file dalam app/package-nya serta interface yang dibentuk (route, API, event, export, worker) bila ada. Ringkasan ini menjadi bukti untuk dokumen kanonis, bukan dokumentasi per-folder.
- `sections`: bagi file per fungsi/kelompok logis dengan rentang baris nyata. File kecil boleh tanpa `sections` sama sekali.
- Do NOT put file hashes anywhere. The CLI computes them itself while scanning — they appear in neither `pending.json` nor `summaries.json`. If you edit a file after summarizing it, just run `sync --plan` again.
- **NEVER paste code, credentials, connection strings, or API keys into a summary.** Describe behavior, don't quote source.

`pending.json` (written by `sync --plan`) is `{ repo, generatedForCommit, files: [{ path, reason, language, size }] }` — `reason` is `new` | `changed` | `needs_summary`. Summarize exactly the paths it lists.

## Hard rules — do not violate
1. Use the CLI for everything. Do not upload files yourself or call the HTTP API directly.
2. Raw source code must never leave the machine — the CLI only uploads metadata + your summaries, and the server rejects/strips anything else.
3. Never put secrets in summaries. Never read or print `.env*` files.
4. Respect `.gitignore` and `.ngodingpakeaiignore`. If the CLI blocks a file, do not bypass it.
5. Always report the sync summary and https://www.ngodingpakeai.com/workspace/d0e45187-2b74-4a09-8808-e37ee64059c4. Only pass on links the CLI actually printed — never assemble one from an id yourself.
6. **For active implementation plans, run the final `sync` ONLY when every task is done — never mid-cycle.** The final summaries pass closes the cycle, rebuilds the wiki, and records a wiki version. `sync --plan` is metadata discovery only and is safe. A prepared reverse baseline plan has no tasks, so its first summary sync is the entry point.
7. **Workspace targeting is fixed.** Use the exact Workspace ID embedded above and the repo's `.ngodingpakeai/config.json`. Never infer a workspace from a plan, account default, URL, or another agent session. If the server reports a workspace conflict or the target looks wrong, STOP and ask the user; never retry with another workspace ID.

## Command reference
| Command | Purpose |
| --- | --- |
| `npx ngodingpakeai doctor` | Verify environment, token, and connectivity. |
| `npx ngodingpakeai connect --workspace <id> --token <ngpk_…>` | Link the repo to a workspace. |
| `npx ngodingpakeai status` | Show connection + last sync state. |
| `npx ngodingpakeai sync --plan` | Upload metadata + write `pending.json` (files needing summaries). |
| `npx ngodingpakeai sync` | Validate + upload `summaries.json`. Fails if pending summaries are missing. |
| `npx ngodingpakeai sync --if-changed` | Skip instantly when HEAD commit is already synced (cheap for loops/CI). |
| `npx ngodingpakeai index` | Local scan preview only (no upload). |
| `npx ngodingpakeai plan get <planId>` | Print a plan's PRD (project context) before working its tasks. |
| `npx ngodingpakeai task next --plan <planId>` | Serve the SINGLE next task to work (full prompt inline), page-ordered & frontend-first. The main loop; `--json` to script. |
| `npx ngodingpakeai task get <ref>` | Fetch a task's title + plan/feature context (no per-task prompt or description; combine with the PRD + your code reading). |
| `npx ngodingpakeai task start <ref>` | Mark a task in-progress (status: doing). |
| `npx ngodingpakeai task complete <ref>` | Mark a task done. |
| `npx ngodingpakeai task fail <ref> "<reason>"` | Report a task stuck/failed with a reason. |
| `npx ngodingpakeai task reset <ref> "<reason>"` | Put a task back to `todo`; a `done` task asks for confirmation. **Only when the user asks.** |
| `npx ngodingpakeai disconnect` | Unlink the repo. |

> `<ref>` is a task reference: either the readable path `<plan>/<feature>/<task>`
> (e.g. `tokoku/autentikasi/buat-form-login`, as shown by `task next`) or the
> task's UUID. Both resolve to the same task — prefer the readable path.

## What the workspace can do after sync
- **A plan built from the code** (first sync of an empty workspace): PRD + fitur + sub-fitur describing what already exists, so the user can plan the NEXT change against it instead of starting from a blank page.
- **Codebase chat**: the user asks questions about their codebase in the web app; answers cite `path:line` from your summaries.
- **Canonical docs**: one repository overview, one overview per meaningful app/package, plus one interface/user-flow document for each app when applicable. They are rebuilt from summaries, with source paths + commit stored as metadata.
- Semantic + symbol search over the whole index; feature → file mapping.
- "Continue project" guidance based on what's already implemented.

## Working on tasks (assigned via a `<task>` block)
When the user hands you a task — usually by pasting a block like:

```
Work on NgodingPakeAI task:

<task identifier="manajemen-konten/transaksi/buat-tabel-transaksi-migrasi">
<title>Buat tabel transaksi & migrasi</title>
<feature>Manajemen Konten</feature>
</task>
```

Use the `identifier` as the `<ref>` below (readable path; the task's UUID also
works). Drive it through the CLI — do NOT guess the work from the title alone:

1. `npx ngodingpakeai task get <ref>` — read the task's `title` + its feature/plan
   context. Figure out the work from the `title`, the PRD (`plan get`), and your
   own reading of the codebase (there's no per-task prompt or description).
2. `npx ngodingpakeai task start <ref>` — mark it in-progress before you begin.
3. Do the work. First explore the existing code & conventions, then follow them.
   Stay within the task's scope — don't invent files/libraries outside the stack.
4. When done: `npx ngodingpakeai task complete <ref>`.

### If you get stuck (don't go silent)
If you can't finish — blocked, missing info, repeated failure — REPORT it instead
of stalling:

```
npx ngodingpakeai task fail <ref> "alasan singkat: apa yang nge-block & sudah coba apa"
```

This flips the task to `failed` and records your reason so the human can unblock
it. Reporting a clear blocker is success, not failure.

### Putting a task back to `todo` (reset) — only when the USER asks
A task can be sent back to `todo` so it can be picked up fresh later:

```
npx ngodingpakeai task reset <ref> "alasan singkat kenapa dibalikin"
```

This clears the "already pulled" mark and appends your reason to the task's log —
the earlier log lines stay, so the history of what was tried is preserved.

**Never reset a task on your own initiative.** Do it ONLY when the user explicitly
asks (e.g. "balikin task ini ke todo", "reset task itu", "batalin yang lagi
dikerjain"). Do not reset to escape a task you find hard — if you're blocked, use
`task fail` and explain. Resetting a `done` task reopens finished work, so the CLI
will show the task and require explicit user confirmation. Never answer that prompt
on the user's behalf or add `--yes` unless the user has explicitly confirmed the
completed-task reset.

### Working through tasks — ONE task at a time via `task next` (the main loop)
Never use `task list`; it is retired and does not return tasks. If the plan ID
is missing, ask the user for the target plan before fetching any tasks.
Do NOT pull the whole backlog and grind through it in one context — that's what makes
output degrade. Instead let the server hand you ONE task at a time and give each its own
clean focus. The backlog is ordered into **phases** (build order) and, within each phase,
**layers** (`frontend` first, then `backend`), then by page (feature) and position. `task
next` walks that order for you: it returns the SINGLE next task — the FIRST page's frontend
tasks first, backend later.

When the user says "kerjakan task" (or hands you a feature/plan instead of a single
`<task>` block), read the PRD once, then loop:

```
npx ngodingpakeai plan get <planId>                    # PRD: project goal, features, tech stack (once)
npx ngodingpakeai task next --plan <planId> --json     # THE single next task
```

The `task next` JSON is `{ done, task, progress }`:
- `done: true` → no task left. **STOP and report to the user.** You're finished.
- `task` → `{ ref, title, ... }` — work from the `title`, backed by the PRD and your own
  reading of the codebase. There is no per-task `prompt` or `description` field; don't wait
  for one.
- `progress` → `{ page, phase: { current, total }, layer, remainingInPage, remainingInLayer }`
  — mostly context, BUT track `layer` and `phase.current`: a change marks a **checkpoint**
  where you stop for the user to verify (see below).

**Checkpoints — stop at each layer/phase boundary.** Remember the `layer` and
`phase.current` of the task you just finished. When `task next` returns a task whose
`layer` differs (e.g. frontend→backend) OR whose `phase.current` is higher, do NOT
`task start` it. STOP, report what's done (e.g. "✅ Frontend phase 1 done — click through
it in the browser"), and WAIT for the user to say "lanjut"/"continue". Then resume
`task next` and keep going to the next boundary. The FIRST task of a session (no previous
task) is NOT a checkpoint — just start it.

For each served task:
1. Read the PRD FIRST (once, at the start) — it's the project's intent.
2. **Checkpoint gate:** if this task's `layer`/`phase.current` crossed a boundary vs the
   last one you finished, STOP and wait for the user (above) instead of starting.
3. `task start <ref>` — mark it in-progress.
4. Do ONLY this task, to completion: explore the existing code & conventions first, then
   follow them. Do NOT read or start any other task while this one is open.
5. `task complete <ref>` (or `task fail <ref> "alasan"` if blocked).
6. Call `task next` again for the next one. Repeat until `done: true` (pausing at each
   layer/phase boundary for the user to verify).

**One task per loop = clean context = sharper output.** Trust the order — never batch
several tasks into one context to "save round-trips"; that defeats the whole point.

**Frontend-first:** `task next` serves `frontend` tasks before `backend`. A frontend task
builds the UI on mock/stub data, ASSUMING the API contract; backend tasks come later and
implement that contract. During a frontend task don't wait on backend — stub it. (If you
ever pull a task by ref directly, `task get` on a locked future phase or the other layer
returns **423 Locked** — that work isn't available yet; keep following `task next`.)

---
_Generated by NgodingPakeAI for AI coding agents. Source of truth: https://www.ngodingpakeai.com._
