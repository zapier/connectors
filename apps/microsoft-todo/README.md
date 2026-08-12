# @zapier/microsoft-todo-connector

<!-- BEGIN:readme-intro -->

Agent-callable tools for Microsoft To Do — manage task lists, tasks, and checklist steps against the [Microsoft Graph v1.0 To Do API](https://learn.microsoft.com/en-us/graph/api/resources/todo-overview). 16 scripts covering full task-list and task CRUD, finding and completing tasks, and checklist (step) management, all authenticated with one Microsoft Graph OAuth 2.0 bearer token.

<!-- legal:disclaimer -->

_Independent, unofficial connector for Microsoft Todo. Not affiliated with, endorsed by, or sponsored by Microsoft Todo. "Microsoft Todo" is a trademark of its owner, used only to identify the service this connector works with._
<!-- /legal:disclaimer -->
<!-- END:readme-intro -->

## When to use this

<!-- BEGIN:readme-when-to-use -->

- An agent needs to capture, find, organize, or complete personal to-do items and their lists.
- An agent needs to break a task down into steps (checklist items).
- The user mentions Microsoft To Do, or a Microsoft 365 task/to-do list, even without naming the connector explicitly.

<!-- END:readme-when-to-use -->

## When NOT to use this

<!-- BEGIN:readme-when-not-to-use -->

- **Outlook mail, calendar, or contacts** — use the `microsoft-outlook` connector instead.
- **Recurring tasks** — recurrence authoring is not supported in this version; create individual tasks instead.
- **Linked resources** (back-links to an external item on a task) — read-only in task output; no CRUD tools ship in this version.

<!-- END:readme-when-not-to-use -->

## Install

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

```bash
# Run a script with zero install — npx fetches the package on first use
export <ENV_VAR>=xxx
npx @zapier/microsoft-todo-connector@latest run <script> '<input-json>' --connection env:<ENV_VAR>

# Install as a dependency to import the functions in your own code
npm install @zapier/microsoft-todo-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills add zapier/connectors --skill microsoft-todo
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection` — a _selector_, not the secret. The `<resolver>:` prefix is optional; a bare value is claimed by the first matching resolver. See [Auth](#auth) below for the with/without-Zapier tradeoffs and how to find a connection ID.

### MCP server

Run the connector as an MCP server over stdio so any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) auto-discovers the scripts as tools — add one stanza to the client's config:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "microsoft-todo": {
      "command": "npx",
      "args": ["@zapier/microsoft-todo-connector", "mcp"]
    }
  }
}
```

`--connection` is optional — omit it to pass a connection per tool call, or add `"--connection", "zapier:<connection-id>"` (or `"env:<ENV_VAR>"` with `"env": { "<ENV_VAR>": "xxx" }`) to `args` to set a default.

## Scripts

<!-- BEGIN:readme-scripts-table -->

| Script       | Description                                           |
| ------------ | ----------------------------------------------------- |
| `listLists`  | List the user's task lists (resolves a `listId`).     |
| `getList`    | Get a single task list by id.                         |
| `createList` | Create a new task list.                               |
| `updateList` | Rename a task list.                                   |
| `deleteList` | Delete a task list and all tasks in it. Irreversible. |

**Tasks**

| Script         | Description                                                  |
| -------------- | ------------------------------------------------------------ |
| `listTasks`    | List or filter tasks in a list (resolves a `taskId`).        |
| `getTask`      | Get a single task by id.                                     |
| `createTask`   | Create a task in a list.                                     |
| `updateTask`   | Update a task's fields; also how to reopen a completed task. |
| `deleteTask`   | Permanently delete a task. Irreversible.                     |
| `findTask`     | Find tasks by exact title without hand-writing OData.        |
| `completeTask` | Mark a task done.                                            |

**Checklist items (steps)**

| Script                | Description                     |
| --------------------- | ------------------------------- |
| `listChecklistItems`  | List the steps of a task.       |
| `createChecklistItem` | Add a step to a task.           |
| `updateChecklistItem` | Rename or check/uncheck a step. |
| `deleteChecklistItem` | Delete a step. Irreversible.    |

<!-- END:readme-scripts-table -->

Run `npx @zapier/microsoft-todo-connector@latest run <script> --help` to see any script's exact input contract + the available resolvers.

## Usage

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function. Pass auth as one `[<resolver>:]<value>` string, e.g. `{ connection: "env:<ENV_VAR>" }`.

<!-- BEGIN:readme-usage-example -->

```ts
import { createTask } from "@zapier/microsoft-todo-connector";

const { data } = await createTask(
  { title: "Buy milk" },
  { connection: "env:MICROSOFT_TODO_ACCESS_TOKEN" },
);
console.log(data.id, data.status);
```

<!-- END:readme-usage-example -->

## Auth

Already have a connection value? Pass it as shown above — `--connection` for the CLI/MCP shapes, `{ connection }` for imported functions. No connection yet? Pick one:

|                                      | Load                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Pass the credential directly         | [`references/use-without-zapier.md`](references/use-without-zapier.md) |
| Route it through a Zapier connection | [`references/use-with-zapier.md`](references/use-with-zapier.md)       |

## Links

- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Source](https://github.com/zapier/connectors/tree/main/apps/microsoft-todo)

<!-- BEGIN:readme-links-extra -->

- [Microsoft Graph To Do API docs](https://learn.microsoft.com/en-us/graph/api/resources/todo-overview)

<!-- END:readme-links-extra -->

<!-- BEGIN:readme-footer? -->
<!-- legal:footer -->

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Microsoft Todo's API, services, data, schemas, documentation, or other materials, which remain the property of Microsoft Todo. Your use of Microsoft Todo's API is governed by your own agreement with Microsoft Todo.

**Trademarks and affiliation.** Microsoft Todo and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Microsoft Todo.

**Your responsibility.** This connector calls Microsoft Todo's API using credentials you supply. You are responsible for holding a valid Microsoft Todo account, for complying with Microsoft Todo's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Microsoft Todo product. Zapier is not responsible for changes Microsoft Todo makes to its API or for any consequence of your use of Microsoft Todo's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
<!-- /legal:footer -->
<!-- END:readme-footer -->
