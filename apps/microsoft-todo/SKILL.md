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

<!-- BEGIN:skill-intro -->

Agent-callable tools for Microsoft To Do against the [Microsoft Graph v1.0 To Do API](https://learn.microsoft.com/en-us/graph/api/resources/todo-overview) (`https://graph.microsoft.com/v1.0/me/todo/...`): list/get/create/update/delete task lists, list/get/create/update/delete tasks, find a task by title, mark a task complete, and manage a task's checklist items (steps). 16 scripts, all against a single user's task lists over one OAuth connection.

<!-- legal:disclaimer -->

_Independent, unofficial connector for Microsoft Todo. Not affiliated with, endorsed by, or sponsored by Microsoft Todo. "Microsoft Todo" is a trademark of its owner, used only to identify the service this connector works with._
<!-- /legal:disclaimer -->
<!-- END:skill-intro -->

## When to use this

<!-- BEGIN:skill-use-cases -->

- An agent needs to **capture or find a task** — create a task (optionally in the default list), find one by title, or list/filter tasks in a list.
- An agent needs to **organize tasks or lists** — create/rename/delete task lists, update a task's due date, importance, or status, or delete a task.
- An agent needs to **complete or reopen work** — mark a task done with `completeTask`, or reopen it via `updateTask(status: "notStarted")`.
- An agent needs to **break a task into steps** — list, add, update, or delete a task's checklist items (subtasks).

<!-- END:skill-use-cases -->

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

If the connector has not been installed as a skill yet, install it first with `npx skills add zapier/connectors --skill microsoft-todo` (or your harness's own skill-install mechanism), then continue here. Installing the skill copies these files, not dependencies. Before running the CLI, a local MCP server, or `zapier-sdk` auth commands, run `npm install --omit=dev` here once. Importing the published package as a dependency in your own project instead? That `npm install` already resolves everything — see [`references/use-as-sdk.md`](references/use-as-sdk.md).

The connector runs on **Node.js 22.18+**. Pick the reference that matches how you're running it, and load it before doing anything else:

| You have...                                                                                                                                                         | Load                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| An MCP-aware client — tools may already be loaded (e.g. `mcp__microsoft-todo__<tool>`), or you can register a local server yourself (or guide the user to)          | [`references/use-as-mcp.md`](references/use-as-mcp.md)       |
| Terminal / subprocess access (you can run `node`)                                                                                                                   | [`references/use-as-cli.md`](references/use-as-cli.md)       |
| Only your own code, importing this package as a dependency                                                                                                          | [`references/use-as-sdk.md`](references/use-as-sdk.md)       |
| No tool access, no terminal, no ability to import this package — you write your own code that calls the Microsoft Todo API directly (e.g. a code-execution sandbox) | [`references/use-as-recipe.md`](references/use-as-recipe.md) |

## Scripts

<!-- BEGIN:skill-connections-note? -->

All scripts use the single connection `microsoft-todo`. `listId` is optional on `createTask`/`listTasks`/`findTask` (omit to target your default list); every other task/checklist script requires an explicit `listId` from `listLists`.
<!-- END:skill-connections-note -->

<!-- BEGIN:skill-scripts-table -->

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

<!-- END:skill-scripts-table -->

<!-- BEGIN:disambiguation-and-refusals? -->

## Disambiguation & refusals

**Disambiguation before acting on a looked-up task.** Before updating, completing, or deleting a task resolved by title (via `findTask` or `listTasks(filter)`), count the matches — task titles aren't unique in Microsoft To Do:

- **Exactly one match** — act on it. Don't over-ask; a single unambiguous match is the answer.
- **Two or more that tie** — stop. List the tied candidates with a distinguishing field (`id`, `dueDateTime`, or `createdDateTime`) and ask the user which one they mean. Don't pick arbitrarily and don't act on all of them.

**Unsupported operations — say so and stop; don't fake it with another tool.** This catalog deliberately does not:

- **Author recurring/repeating tasks.** `createTask`/`updateTask` have no recurrence input. If asked to create a task that repeats, create the one-time task and say recurrence isn't supported — don't invent a workaround that silently drops the repeat.
- **Move a task between lists as a single operation.** There's no `moveTask` tool. To relocate a task, create it in the target list and delete the original — and say so, since the task gets a new id (a task's id changes whenever it moves between lists; don't claim the original id was relocated in place).
- **Show a task's linked source item** (e.g. the email it was created from). `linkedResources` aren't exposed by any tool — only `checklistItems` (steps) are.

If asked for any of these, tell the user it's unsupported (or, for a move, explain the recreate-and-delete workaround) and stop — don't reach for an unrelated tool to approximate it.
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

| Reference                                                                              | Covers                                                                                                                                                                                                                                                                                            | Load it when                                                                                                                                                                      |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`references/microsoft-todo-api-gotchas.md`](references/microsoft-todo-api-gotchas.md) | Auth/permissions (delegated-only writes), id stability after list moves, `todoTaskList` shape (`wellknownListName`, built-in lists), task status + `dateTimeTimeZone` handling, task body update quirk, categories, checklist items vs. linked resources, pagination, error codes, rate limiting. | A call errors, a `taskId` stops resolving after a list move, a date/time value doesn't round-trip as expected, or you're unsure how paging, built-in lists, or categories behave. |
| [`references/use-as-recipe.md`](references/use-as-recipe.md)                           | A reference implementation of the request/response shapes and error-handling pattern for calling Microsoft Graph To Do directly, for a harness that can't load these tools, run the CLI, or import this package.                                                                                  | You're writing your own code against the vendor API (e.g. a code-execution sandbox) instead of calling this connector's tools/CLI/package directly.                               |

<!-- END:skill-references-table -->
