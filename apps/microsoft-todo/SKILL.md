---
name: microsoft-todo
description: Create, find, complete, and organize tasks and task lists in Microsoft To Do (Microsoft's to-do app), plus break tasks into checklist steps. Use when the user wants to capture a task, check their to-do list, mark something done, or manage their tasks/lists — even if they don't say "Microsoft To Do" explicitly (e.g. "add buy milk to my tasks", "what's on my to-do list", "mark that done").
license: Elastic-2.0
compatibility: Run `npm install --omit=dev` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for build-it-yourself / prebuilt / alternative-runtime options.
metadata:
  source: https://github.com/zapier/connectors/blob/main/apps/microsoft-todo/SKILL.md
  title: Microsoft Todo
  api-docs: https://learn.microsoft.com/en-us/graph/api/resources/todo-overview
  zapier-app-key: MSTodoCLIAPI
---

# Microsoft Todo

_Independent, unofficial connector for Microsoft Todo. Not affiliated with, endorsed by, or sponsored by Microsoft Todo. "Microsoft Todo" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable tools for Microsoft To Do against the [Microsoft Graph v1.0 To Do API](https://learn.microsoft.com/en-us/graph/api/resources/todo-overview) (`https://graph.microsoft.com/v1.0/me/todo/...`): list/get/create/update/delete task lists, list/get/create/update/delete tasks, find a task by title, mark a task complete, and manage a task's checklist items (steps). 16 scripts, all against a single user's task lists over one OAuth connection.

## When to use this

- An agent needs to **capture or find a task** — create a task (optionally in the default list), find one by title, or list/filter tasks in a list.
- An agent needs to **organize tasks or lists** — create/rename/delete task lists, update a task's due date, importance, or status, or delete a task.
- An agent needs to **complete or reopen work** — mark a task done with `completeTask`, or reopen it via `updateTask(status: "notStarted")`.
- An agent needs to **break a task into steps** — list, add, update, or delete a task's checklist items (subtasks).

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

**If this connector is already exposed to you as callable tools** (e.g. `mcp__microsoft-todo__<tool>`), that's a valid path — call them directly. Everything below is only for standalone terminal use when no such tools are loaded.

If the connector has not been installed as a skill yet, install it first with `npx skills zapier/connectors --skill microsoft-todo` (or your harness's own skill-install mechanism), then continue here.

The connector runs on **Node.js 22.18+** and needs a one-time `npm install` in this directory. `cli.js` is the entry point — list every script with `node cli.js --help`, then learn a script's inputs and connections with `node cli.js run <script> --help`. On older Node, run `node cli.js --help` anyway: it detects your runtime and prints how to run without upgrading (the prebuilt npm package, or another runtime) — don't skip the connector just because Node is old.

`cli.js` self-checks readiness before running: if dependencies aren't installed it exits non-zero with the exact install command (it disambiguates a read-only directory from a sandbox-blocked package cache). Run that, then re-run your command.

## Scripts

All scripts use the single connection `microsoft-todo`. `listId` is optional on `createTask`/`listTasks`/`findTask` (omit to target your default list); every other task/checklist script requires an explicit `listId` from `listLists`.

| Script                                                             | Script name           | Connections      | Description                                                             |
| ------------------------------------------------------------------ | --------------------- | ---------------- | ----------------------------------------------------------------------- |
| [`scripts/listLists.ts`](scripts/listLists.ts)                     | `listLists`           | `microsoft-todo` | List the user's task lists (the primary way to resolve a `listId`).     |
| [`scripts/getList.ts`](scripts/getList.ts)                         | `getList`             | `microsoft-todo` | Get a single task list by id.                                           |
| [`scripts/createList.ts`](scripts/createList.ts)                   | `createList`          | `microsoft-todo` | Create a new task list.                                                 |
| [`scripts/updateList.ts`](scripts/updateList.ts)                   | `updateList`          | `microsoft-todo` | Rename a task list.                                                     |
| [`scripts/deleteList.ts`](scripts/deleteList.ts)                   | `deleteList`          | `microsoft-todo` | Delete a task list and all tasks in it. Irreversible.                   |
| [`scripts/listTasks.ts`](scripts/listTasks.ts)                     | `listTasks`           | `microsoft-todo` | List or filter tasks in a list (the primary way to resolve a `taskId`). |
| [`scripts/getTask.ts`](scripts/getTask.ts)                         | `getTask`             | `microsoft-todo` | Get a single task by id.                                                |
| [`scripts/createTask.ts`](scripts/createTask.ts)                   | `createTask`          | `microsoft-todo` | Create a task in a list.                                                |
| [`scripts/updateTask.ts`](scripts/updateTask.ts)                   | `updateTask`          | `microsoft-todo` | Update a task's fields; also how to reopen a completed task.            |
| [`scripts/deleteTask.ts`](scripts/deleteTask.ts)                   | `deleteTask`          | `microsoft-todo` | Permanently delete a task. Irreversible.                                |
| [`scripts/findTask.ts`](scripts/findTask.ts)                       | `findTask`            | `microsoft-todo` | Find tasks by exact title without hand-writing OData.                   |
| [`scripts/completeTask.ts`](scripts/completeTask.ts)               | `completeTask`        | `microsoft-todo` | Mark a task done.                                                       |
| [`scripts/listChecklistItems.ts`](scripts/listChecklistItems.ts)   | `listChecklistItems`  | `microsoft-todo` | List the steps (checklist items) of a task.                             |
| [`scripts/createChecklistItem.ts`](scripts/createChecklistItem.ts) | `createChecklistItem` | `microsoft-todo` | Add a step to a task.                                                   |
| [`scripts/updateChecklistItem.ts`](scripts/updateChecklistItem.ts) | `updateChecklistItem` | `microsoft-todo` | Rename or check/uncheck a step.                                         |
| [`scripts/deleteChecklistItem.ts`](scripts/deleteChecklistItem.ts) | `deleteChecklistItem` | `microsoft-todo` | Delete a step. Irreversible.                                            |

## Auth

Pass auth as one connection string with `--connection [<resolver>:]<value>`. The value is a selector, not the secret; the `<resolver>:` prefix is optional (a bare value goes to the first resolver that claims it). Each script declares the connections it needs and the resolvers each accepts — always run `node cli.js run <script> --help` to see them rather than relying on this file.

The connector needs a single Microsoft Graph **OAuth 2.0 bearer token**, resolved into the one `microsoft-todo` connection slot. Two resolvers:

- **`zapier:<connection-id>`** — Zapier-managed auth (recommended). Route through a Zapier Microsoft To Do connection; the Zapier auth/retries/governance layer injects and refreshes the token for you. **Prerequisite: a Zapier account** (free signup at <https://zapier.com>). Find the ID with the Zapier SDK CLI: `npx zapier-sdk list-connections MSTodoCLIAPI` (run `login` first if unauthenticated; add `--json` for machine output).
- **`env:<ENV_VAR>`** — direct mode. A Graph access token (conventionally `MICROSOFT_TODO_ACCESS_TOKEN`) already carrying the delegated scopes the tools need (`Tasks.ReadWrite`, `User.Read`, `offline_access`). Microsoft access tokens expire 60–90 minutes after issue ([Microsoft's default access-token lifetime](https://learn.microsoft.com/en-us/entra/identity-platform/configurable-token-lifetimes)) and this mode does **not** refresh them, so it suits short-lived/testing use — prefer the Zapier-managed connection otherwise.

Task creation is delegated-only — Microsoft does not support application (daemon) permissions for `POST .../tasks` — so the connected account must be a signed-in user, not a service principal.

## Running scripts

After `npm install`, run a script by name with `node cli.js run <script>`, or execute its file directly — both take the same arguments and both accept `--help`. Always run a script's `--help` first to learn its exact input schema and connections, then invoke it:

```bash
# default — via the entry point; self-checks readiness and prints friendly diagnostics
node cli.js run <script> '<input-json>' --connection [<resolver>:]<value>
# shorthand — runs the script file directly (same args, same Node 22.18+ need, no readiness check)
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

**Disambiguation before acting on a looked-up task.** Before updating, completing, or deleting a task resolved by title (via `findTask` or `listTasks(filter)`), count the matches — task titles aren't unique in Microsoft To Do:

- **Exactly one match** — act on it. Don't over-ask; a single unambiguous match is the answer.
- **Two or more that tie** — stop. List the tied candidates with a distinguishing field (`id`, `dueDateTime`, or `createdDateTime`) and ask the user which one they mean. Don't pick arbitrarily and don't act on all of them.

**Unsupported operations — say so and stop; don't fake it with another tool.** This catalog deliberately does not:

- **Author recurring/repeating tasks.** `createTask`/`updateTask` have no recurrence input. If asked to create a task that repeats, create the one-time task and say recurrence isn't supported — don't invent a workaround that silently drops the repeat.
- **Move a task between lists as a single operation.** There's no `moveTask` tool. To relocate a task, create it in the target list and delete the original — and say so, since the task gets a new id (a task's id changes whenever it moves between lists; don't claim the original id was relocated in place).
- **Show a task's linked source item** (e.g. the email it was created from). `linkedResources` aren't exposed by any tool — only `checklistItems` (steps) are.

If asked for any of these, tell the user it's unsupported (or, for a move, explain the recreate-and-delete workaround) and stop — don't reach for an unrelated tool to approximate it.

## References

Load the matching reference file before working in that area:

| Reference                                                                              | Covers                                                                                                                                                                                                                                                                                            | Load it when                                                                                                                                                                      |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`references/microsoft-todo-api-gotchas.md`](references/microsoft-todo-api-gotchas.md) | Auth/permissions (delegated-only writes), id stability after list moves, `todoTaskList` shape (`wellknownListName`, built-in lists), task status + `dateTimeTimeZone` handling, task body update quirk, categories, checklist items vs. linked resources, pagination, error codes, rate limiting. | A call errors, a `taskId` stops resolving after a list move, a date/time value doesn't round-trip as expected, or you're unsure how paging, built-in lists, or categories behave. |
| [`references/use-as-recipe.md`](references/use-as-recipe.md)                           | A reference implementation of the request/response shapes and error-handling pattern for calling Microsoft Graph To Do directly, for a harness that can't load these tools, run the CLI, or import this package.                                                                                  | You're writing your own code against the vendor API (e.g. a code-execution sandbox) instead of calling this connector's tools/CLI/package directly.                               |
