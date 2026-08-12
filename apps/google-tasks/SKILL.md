---
name: google-tasks
description: Agent-callable Google Tasks tools — create, list, update, complete, move, and delete tasks and task lists. Use when the user wants to manage Google Tasks or to-dos, even if they don't name Google Tasks explicitly.
license: Elastic-2.0
compatibility: Run `npm install --omit=dev` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for build-it-yourself / prebuilt / alternative-runtime options.
metadata:
  source: https://github.com/zapier/connectors/blob/main/apps/google-tasks/SKILL.md
  title: Google Tasks
  api-docs: https://developers.google.com/workspace/tasks/reference/rest
  zapier-app-key: GoogleTasksCLIAPI
---

# Google Tasks

<!-- BEGIN:skill-intro -->

Agent-callable tools for Google Tasks (the [Google Tasks API v1](https://developers.google.com/workspace/tasks/reference/rest)). Manage **task lists** (list, get, create, rename, delete) and **tasks** (list, find by title, get, create, update, complete/reopen, reorder/reparent/move, delete, and clear completed). Authenticate once with a Zapier-managed Google connection (recommended) or a direct OAuth token. The connector exposes the full task surface as 13 single-purpose scripts with stable, predictable I/O — no triggers (it is non-polling).

<!-- legal:disclaimer -->

_Independent, unofficial connector for Google Tasks. Not affiliated with, endorsed by, or sponsored by Google Tasks. "Google Tasks" is a trademark of its owner, used only to identify the service this connector works with._
<!-- /legal:disclaimer -->
<!-- END:skill-intro -->

## When to use this

<!-- BEGIN:skill-use-cases -->

- **Capture and organize to-dos** — create tasks (optionally as subtasks or at a position), create and rename task lists.
- **Review what's on a list** — list active (or completed) tasks, find a task by title, get a task's details.
- **Move work forward** — mark tasks complete or reopen them, reorder or reparent tasks, move a task to another list.
- **Prune** — delete a task or list, or clear (hide) all completed tasks in a list.
- Use whenever the user wants to manage Google Tasks or their to-do list, even if they don't name Google Tasks explicitly.

<!-- END:skill-use-cases -->

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

If the connector has not been installed as a skill yet, install it first with `npx skills add zapier/connectors --skill google-tasks` (or your harness's own skill-install mechanism), then continue here. Installing the skill copies these files, not dependencies. Before running the CLI, a local MCP server, or `zapier-sdk` auth commands, run `npm install --omit=dev` here once. Importing the published package as a dependency in your own project instead? That `npm install` already resolves everything — see [`references/use-as-sdk.md`](references/use-as-sdk.md).

The connector runs on **Node.js 22.18+**. Pick the reference that matches how you're running it, and load it before doing anything else:

| You have...                                                                                                                                                       | Load                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| An MCP-aware client — tools may already be loaded (e.g. `mcp__google-tasks__<tool>`), or you can register a local server yourself (or guide the user to)          | [`references/use-as-mcp.md`](references/use-as-mcp.md)       |
| Terminal / subprocess access (you can run `node`)                                                                                                                 | [`references/use-as-cli.md`](references/use-as-cli.md)       |
| Only your own code, importing this package as a dependency                                                                                                        | [`references/use-as-sdk.md`](references/use-as-sdk.md)       |
| No tool access, no terminal, no ability to import this package — you write your own code that calls the Google Tasks API directly (e.g. a code-execution sandbox) | [`references/use-as-recipe.md`](references/use-as-recipe.md) |

## Scripts

<!-- BEGIN:skill-connections-note? -->

All scripts use a single `google-tasks` connection.
<!-- END:skill-connections-note -->

<!-- BEGIN:skill-scripts-table -->

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

<!-- END:skill-scripts-table -->

<!-- BEGIN:disambiguation-and-refusals? -->

## Disambiguation & refusals

- **Resolving a task or list by name.** Before updating, completing, moving, or deleting a task referenced by title, resolve it first — `findTask` returns the best title match, or `listTasks` to see candidates. If two or more tasks in the list have the **same title** (exact, case-insensitive), don't silently pick one: list the tied candidates with a distinguishing field (due date, status, notes) and ask which one. If exactly one matches, act on it — don't over-ask. Same rule for `listTaskLists` when a list is named.
- **Unsupported operations — say so, don't fake it.** This connector cannot: create or edit **recurring** tasks (the API has no recurrence fields — recurrence is managed only in the Google Tasks app), set a task's **time of day or reminder** (`due` is date-only — the time is discarded), or reorder by writing `position` (use `moveTask`). If asked for one of these, say it's unsupported and stop — do not substitute another tool and report success for something you didn't do.

<!-- END:disambiguation-and-refusals -->

## Auth

Every shape passes auth as one connection **selector**, not the secret — a `[<resolver>:]<value>` string. Every connector accepts `zapier:<connection-id>` (Zapier-managed auth — routes through Zapier's auth, retries, and governance layer); some also accept one or more direct-token resolvers (naming and count vary per connector) — check this connector's own resolvers rather than assuming. The `<resolver>:` prefix is optional; a bare value goes to the first resolver that claims it — a UUID-shaped bare value always claims `zapier:`. Each script declares the connections it needs and the resolvers each accepts. The exact syntax for passing a connection (and how to see this connector's resolver list) differs by shape — see the reference you loaded above.

Checking what's already configured first? Don't dump environment values to do it — `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if one is set. Check names only (`env | cut -d= -f1 | grep -i <name>`) or test a known name directly (`[ -n "$VAR_NAME" ]`).

<!-- BEGIN:skill-auth-notes? operational behavior that differs by WHICH resolver is used — a safety gate only one path enforces, scopes/permissions that differ between resolvers, a billing/plan difference tied to the auth path, or a feature only available (or unavailable) on one resolver. Not for describing how to obtain or pass a credential — that's references/use-without-zapier.md's job. Leave this region empty (unfilled) if every resolver behaves identically. -->
<!-- END:skill-auth-notes -->

No connection yet? Pick one — and follow the reference's own flow to obtain it; never just ask the user for a connection id or token as if they already have one memorized:

|                                      | Load                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Pass the credential directly         | [`references/use-without-zapier.md`](references/use-without-zapier.md) |
| Route it through a Zapier connection | [`references/use-with-zapier.md`](references/use-with-zapier.md)       |

## Output format

Every script returns a `{ data, meta }` envelope:

- **`data`** — the script's result (the shape its `outputSchema` declares; see the reference you loaded above for how to inspect a script's exact schema in your shape).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths were stripped from `data`: fields the script returned from the API that the `outputSchema` doesn't declare. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked script output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, opt out of output validation (the exact syntax differs by shape — see the reference you loaded above). Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, pass a jq expression that post-processes `data` (again, exact syntax per shape). The jq runs against `data` only, NOT the `{ data, meta }` envelope, so write it rooted at `data` (run the script's `--help` — or your shape's equivalent — to see its output schema). The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated against the output schema.

<!-- BEGIN:skill-references-table -->

## References

Load the matching reference file before working in that area:

| Reference                                                                        | Covers                    | Load it when                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [references/google-tasks-api-gotchas.md](references/google-tasks-api-gotchas.md) | API quirks and edge cases | A task or task-list call behaves unexpectedly — due dates losing their time, `position`/ordering, `status`/completion being server-managed, hidden vs. deleted tasks, subtask nesting limits, assigned tasks (from Docs/Chat), pagination/page-size or per-user limits, quota/rate-limit (`429`/quota reasons), or auth-scope (`401`/`403 insufficientPermissions`) errors. |

<!-- END:skill-references-table -->
