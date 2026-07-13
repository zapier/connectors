# @zapier/google-tasks-connector

_Independent, unofficial connector for Google Tasks. Not affiliated with, endorsed by, or sponsored by Google Tasks. "Google Tasks" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable tools for [Google Tasks](https://developers.google.com/workspace/tasks/reference/rest) — manage task lists and tasks end to end: create, list, find by title, get, update (complete/reopen), reorder, reparent, move between lists, and delete tasks; create, rename, and delete task lists; and clear completed tasks. Wraps the Google Tasks API v1 over Google OAuth 2.0 — authenticate once with a Zapier-managed connection (recommended, auto-refreshing) or a direct OAuth token. 13 single-purpose scripts with stable, predictable I/O; no triggers.

## When to use this

- Managing a user's Google Tasks: capturing to-dos, organizing them into lists and subtasks, marking them done, and cleaning up.
- Resolving a task or list by name to an id before acting on it (`findTask` / `listTaskLists`), then updating, moving, or deleting it.
- Read-then-act task workflows where you want predictable, validated JSON rather than a polling trigger.

## When NOT to use this

- **Recurring tasks** — the Google Tasks API has no recurrence fields; create/edit recurrence in the Google Tasks app, not here.
- **Task times / reminders** — `due` is date-only (the time is discarded); there's no time-of-day or reminder field in the API.
- **Change notifications** — this is a non-trigger connector; it does not watch for new/changed tasks.

## Install

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

```bash
# Run a script with zero install — npx fetches the package on first use
export <ENV_VAR>=xxx
npx @zapier/google-tasks-connector@latest run <script> '<input-json>' --connection env:<ENV_VAR>

# Install as a dependency to import the functions in your own code
npm install @zapier/google-tasks-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills add zapier/connectors --skill google-tasks
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection`. The value is a _selector_, not the secret: `--connection zapier:<connection-id>` routes through Zapier-managed auth (recommended; no third-party secret enters the agent's environment, and the connection id isn't itself a secret so you can pass it as-is), and `--connection env:<ENV_VAR>` reads a direct token from `$<ENV_VAR>` (the token stays in `env`, never on argv). The `<resolver>:` prefix is optional — a bare value is claimed by the first matching resolver. See [`SKILL.md`](SKILL.md#auth) for tradeoffs and how to find a connection ID.

### MCP server

Run the connector as an MCP server over stdio so any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) auto-discovers the scripts as tools — add one stanza to the client's config:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "google-tasks": {
      "command": "npx",
      "args": ["@zapier/google-tasks-connector", "mcp"]
    }
  }
}
```

`--connection` is optional — omit it to pass a connection per tool call, or add `"--connection", "zapier:<connection-id>"` (or `"env:<ENV_VAR>"` with `"env": { "<ENV_VAR>": "xxx" }`) to `args` to set a default.

## Scripts

| Script                | Description                                                                           |
| --------------------- | ------------------------------------------------------------------------------------- |
| `listTaskLists`       | List the user's task lists (id + title).                                              |
| `getTaskList`         | Get a single task list by id.                                                         |
| `createTaskList`      | Create a new task list.                                                               |
| `updateTaskList`      | Rename a task list.                                                                   |
| `deleteTaskList`      | Delete a task list and all tasks in it (irreversible).                                |
| `listTasks`           | List/search tasks in a list (active-only by default; completion/due/updated filters). |
| `findTask`            | Find a task in a list by title (exact match preferred).                               |
| `getTask`             | Get a single task by id.                                                              |
| `createTask`          | Create a task (optionally a subtask / at a position).                                 |
| `updateTask`          | Update a task; set `status` to complete or reopen it.                                 |
| `moveTask`            | Reposition, reparent, or move a task to another list.                                 |
| `deleteTask`          | Permanently delete a task.                                                            |
| `clearCompletedTasks` | Hide all completed tasks in a list (recoverable).                                     |

Run `npx @zapier/google-tasks-connector@latest run <script> --help` to see any script's exact input contract + the available resolvers.

## Usage

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function. Pass auth as one `[<resolver>:]<value>` string, e.g. `{ connection: "env:<ENV_VAR>" }`.

```ts
import { createTask } from "@zapier/google-tasks-connector";

// Each named export is the consumer-facing (input, opts) => Promise<{ data, meta }>.
const { data } = await createTask(
  { tasklist: "@default", title: "Buy milk", due: "2026-06-30" },
  { connection: "env:GOOGLE_TASKS_ACCESS_TOKEN" },
);
// data → the created task: { id, title, status, due, ... }
```

## Links

- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Source](https://github.com/zapier/connectors/tree/main/apps/google-tasks)
- [Google Tasks API reference](https://developers.google.com/workspace/tasks/reference/rest)

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Google Tasks's API, services, data, schemas, documentation, or other materials, which remain the property of Google Tasks. Your use of Google Tasks's API is governed by your own agreement with Google Tasks.

**Trademarks and affiliation.** Google Tasks and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Google Tasks.

**Your responsibility.** This connector calls Google Tasks's API using credentials you supply. You are responsible for holding a valid Google Tasks account, for complying with Google Tasks's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Google Tasks product. Zapier is not responsible for changes Google Tasks makes to its API or for any consequence of your use of Google Tasks's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
