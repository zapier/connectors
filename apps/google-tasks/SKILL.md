---
name: google-tasks
description: Agent-callable Google Tasks tools — create, list, update, complete, move, and delete tasks and task lists. Use when the user wants to manage Google Tasks or to-dos, even if they don't name Google Tasks explicitly.
license: Elastic-2.0
compatibility: Requires Node.js 22.18+; run `npm install` in this directory first.
metadata:
  source: https://github.com/zapier/connectors/blob/main/apps/google-tasks/SKILL.md
  title: Google Tasks
  api-docs: https://developers.google.com/workspace/tasks/reference/rest
  zapier-app-key: GoogleTasksCLIAPI
---

# Google Tasks

_Independent, unofficial connector for Google Tasks. Not affiliated with, endorsed by, or sponsored by Google Tasks. "Google Tasks" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable tools for Google Tasks (the [Google Tasks API v1](https://developers.google.com/workspace/tasks/reference/rest)). Manage **task lists** (list, get, create, rename, delete) and **tasks** (list, find by title, get, create, update, complete/reopen, reorder/reparent/move, delete, and clear completed). Authenticate once with a Zapier-managed Google connection (recommended) or a direct OAuth token. The connector exposes the full task surface as 13 single-purpose scripts with stable, predictable I/O — no triggers (it is non-polling).

## When to use this

- **Capture and organize to-dos** — create tasks (optionally as subtasks or at a position), create and rename task lists.
- **Review what's on a list** — list active (or completed) tasks, find a task by title, get a task's details.
- **Move work forward** — mark tasks complete or reopen them, reorder or reparent tasks, move a task to another list.
- **Prune** — delete a task or list, or clear (hide) all completed tasks in a list.
- Use whenever the user wants to manage Google Tasks or their to-do list, even if they don't name Google Tasks explicitly.

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

**If this connector is already exposed to you as callable tools** (e.g. `mcp__google-tasks__<tool>`), that's a valid path — call them directly. Everything below is only for standalone terminal use when no such tools are loaded.

If the connector has not been installed as a skill yet, install it first with `npx skills zapier/connectors --skill google-tasks` (or your harness's own skill-install mechanism), then continue here.

The connector runs on **Node.js 22.18+** and needs a one-time `npm install` in this directory. `cli.js` is the entry point — list every script with `node cli.js --help`, then learn a script's inputs and connections with `node cli.js run <script> --help`.

`cli.js` self-checks readiness before running: if dependencies aren't installed it exits non-zero with the exact install command (it disambiguates a read-only directory from a sandbox-blocked package cache). Run that, then re-run your command.

## Scripts

All scripts use a single `google-tasks` connection.

| Script                           | Script name           | Connections    | Description                                                                               |
| -------------------------------- | --------------------- | -------------- | ----------------------------------------------------------------------------------------- |
| `scripts/listTaskLists.ts`       | `listTaskLists`       | `google-tasks` | List the user's task lists (id + title). The resolver for any `tasklist` input.           |
| `scripts/getTaskList.ts`         | `getTaskList`         | `google-tasks` | Get a single task list by id.                                                             |
| `scripts/createTaskList.ts`      | `createTaskList`      | `google-tasks` | Create a new task list.                                                                   |
| `scripts/updateTaskList.ts`      | `updateTaskList`      | `google-tasks` | Rename a task list (title is the only editable field).                                    |
| `scripts/deleteTaskList.ts`      | `deleteTaskList`      | `google-tasks` | Delete a task list and all tasks in it (irreversible).                                    |
| `scripts/listTasks.ts`           | `listTasks`           | `google-tasks` | List/search tasks in a list; active-only by default, with completion/due/updated filters. |
| `scripts/findTask.ts`            | `findTask`            | `google-tasks` | Find a task in a list by title (exact match preferred). Resolves a title to a task id.    |
| `scripts/getTask.ts`             | `getTask`             | `google-tasks` | Get a single task by id.                                                                  |
| `scripts/createTask.ts`          | `createTask`          | `google-tasks` | Create a task (optionally a subtask / at a position).                                     |
| `scripts/updateTask.ts`          | `updateTask`          | `google-tasks` | Update a task; set `status` to complete or reopen it.                                     |
| `scripts/moveTask.ts`            | `moveTask`            | `google-tasks` | Reposition, reparent, or move a task to another list.                                     |
| `scripts/deleteTask.ts`          | `deleteTask`          | `google-tasks` | Permanently delete a task.                                                                |
| `scripts/clearCompletedTasks.ts` | `clearCompletedTasks` | `google-tasks` | Hide all completed tasks in a list (recoverable; non-destructive).                        |

## Auth

Pass auth as one connection string with `--connection [<resolver>:]<value>`. The value is a selector, not the secret; the `<resolver>:` prefix is optional (a bare value goes to the first resolver that claims it). Each script declares the connections it needs and the resolvers each accepts — always run `node cli.js run <script> --help` to see them rather than relying on this file.

Google Tasks uses Google **OAuth 2.0** (scope `https://www.googleapis.com/auth/tasks` — full read/write; the read-only scope `…/auth/tasks.readonly` covers only the list/get tools). One connection slot, `google-tasks`, with two modes:

- **Zapier-managed (recommended) — `zapier:<connection-id>`.** Select the Google Tasks connection by id (`GOOGLE_TASKS_ZAPIER_CONNECTION_ID`). Zapier injects the credential per request and handles token refresh, retries, and governance — nothing expires on you.
- **Direct token — `env:GOOGLE_TASKS_ACCESS_TOKEN`.** A Google OAuth access token, sent as a bearer header. Note: Google access tokens expire ~1 hour after issue and this mode does **not** refresh them, so it suits short-lived/testing use; prefer the Zapier-managed connection for anything ongoing.
- `GOOGLE_TASKS_REFRESH_TOKEN` / `GOOGLE_TASKS_CLIENT_ID` / `GOOGLE_TASKS_CLIENT_SECRET` are **reserved for a future refresh-capable direct mode and are not used in this version.**

## Running scripts

After `npm install`, run a script by name with `node cli.js run <script>`, or execute its file directly — both take the same arguments and both accept `--help`. Always run a script's `--help` first to learn its exact input schema and connections, then invoke it:

```bash
node cli.js run <script> '<input-json>' --connection [<resolver>:]<value>
./scripts/<script>.ts '<input-json>' --connection [<resolver>:]<value>
```

When a harness can't execute scripts directly, fall back to MCP — `node cli.js mcp` serves every script as a tool over stdio. Register it as a local MCP server in your client: the stanza is harness-specific (an `mcpServers` entry in Claude Desktop, Cursor, Claude Code, …) with `command: "node"`, `args: ["cli.js", "mcp"]`, run from this directory. Run `node cli.js mcp --help` for auth options. Add the stanza yourself if you can edit the client's MCP config; otherwise guide the user. If a local server isn't possible, guide the user to use Zapier's remote MCP servers at <https://mcp.zapier.com> instead.

## Output format

Every script returns a `{ data, meta }` envelope:

- **`data`** — the script's result (the shape its `outputSchema` declares; run the script's `--help` to see that exact schema).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths were stripped from `data`: fields the script returned from the API that the `outputSchema` doesn't declare. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked script output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, append `--skipOutputDataValidation` to the script invocation. Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, append `--filterOutputData '<jq>'` — a jq expression that post-processes `data`. The jq runs against `data` only, NOT the `{ data, meta }` envelope, so write it rooted at `data` (run the script's `--help` to see its output schema). The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated against the output schema.

## Disambiguation & refusals

- **Resolving a task or list by name.** Before updating, completing, moving, or deleting a task referenced by title, resolve it first — `findTask` returns the best title match, or `listTasks` to see candidates. If two or more tasks in the list have the **same title** (exact, case-insensitive), don't silently pick one: list the tied candidates with a distinguishing field (due date, status, notes) and ask which one. If exactly one matches, act on it — don't over-ask. Same rule for `listTaskLists` when a list is named.
- **Unsupported operations — say so, don't fake it.** This connector cannot: create or edit **recurring** tasks (the API has no recurrence fields — recurrence is managed only in the Google Tasks app), set a task's **time of day or reminder** (`due` is date-only — the time is discarded), or reorder by writing `position` (use `moveTask`). If asked for one of these, say it's unsupported and stop — do not substitute another tool and report success for something you didn't do.

## References

Load the matching reference file before working in that area:

| Reference                                                                        | Covers                    | Load it when                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [references/google-tasks-api-gotchas.md](references/google-tasks-api-gotchas.md) | API quirks and edge cases | A task or task-list call behaves unexpectedly — due dates losing their time, `position`/ordering, `status`/completion being server-managed, hidden vs. deleted tasks, subtask nesting limits, assigned tasks (from Docs/Chat), pagination/page-size or per-user limits, quota/rate-limit (`429`/quota reasons), or auth-scope (`401`/`403 insufficientPermissions`) errors. |
