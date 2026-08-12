# @zapier/harvest-connector

<!-- BEGIN:readme-intro -->

_Independent, unofficial connector for Harvest. Not affiliated with, endorsed by, or sponsored by Harvest. "Harvest" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable tools for [Harvest](https://help.getharvest.com/api-v2/), the time-tracking and project-billing service. This connector wraps the [Harvest API v2](https://help.getharvest.com/api-v2/) (`https://api.harvestapp.com/v2/`) so an agent can track time (log hours by duration or by start/end time, and start, stop, or restart timers), manage the projects, clients, contacts, and tasks that time is logged against, and read time entries, projects, clients, tasks, and invoices. Auth is a single connection: a bearer token (a long-lived Personal Access Token or an OAuth access token) plus a numeric Harvest account id, passed directly or via Zapier-managed auth.

<!-- legal:disclaimer -->

_Independent, unofficial connector for Harvest. Not affiliated with, endorsed by, or sponsored by Harvest. "Harvest" is a trademark of its owner, used only to identify the service this connector works with._
<!-- /legal:disclaimer -->
<!-- END:readme-intro -->

## When to use this

<!-- BEGIN:readme-when-to-use -->

- Logging or editing time, and starting/stopping timers, in Harvest.
- Setting up and reading the projects, clients, contacts, and tasks that time is tracked against — including assigning a task to a project so time can be logged on it.
- Answering "what did we log or bill for this client/project" from time entries and invoices, and reading account context (current user, company time-tracking mode).

<!-- END:readme-when-to-use -->

## When NOT to use this

<!-- BEGIN:readme-when-not-to-use -->

- **Invoice / estimate / expense writes** — this connector reads invoices but does not create or send invoices or estimates, or log expenses. Use Harvest directly for billing operations.
- **Aggregate reporting** — the Harvest Reports API (time/expense/uninvoiced summaries) is not covered; use per-record `list*` tools or Harvest's reports UI.
- **User administration** — inviting, archiving, or role-managing teammates is out of scope; `listUsers` / `getCurrentUser` are read-only.

<!-- END:readme-when-not-to-use -->

## Install

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

```bash
# Run a script with zero install — npx fetches the package on first use
export <ENV_VAR>=xxx
npx @zapier/harvest-connector@latest run <script> '<input-json>' --connection env:<ENV_VAR>

# Install as a dependency to import the functions in your own code
npm install @zapier/harvest-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills add zapier/connectors --skill harvest
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection` — a _selector_, not the secret. The `<resolver>:` prefix is optional; a bare value is claimed by the first matching resolver. See [Auth](#auth) below for the with/without-Zapier tradeoffs and how to find a connection ID.

### MCP server

Run the connector as an MCP server over stdio so any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) auto-discovers the scripts as tools — add one stanza to the client's config:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "harvest": {
      "command": "npx",
      "args": ["@zapier/harvest-connector", "mcp"]
    }
  }
}
```

`--connection` is optional — omit it to pass a connection per tool call, or add `"--connection", "zapier:<connection-id>"` (or `"env:<ENV_VAR>"` with `"env": { "<ENV_VAR>": "xxx" }`) to `args` to set a default.

## Scripts

<!-- BEGIN:readme-scripts-table -->

| Script | Description |
| ------ | ----------- |

**Time tracking**

| Script                       | Description                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| createTimeEntry              | Log time by duration (hours) against a project + task. Omit `hours` to start a running timer. Duration-mode accounts. |
| createTimeEntryForTimestamps | Log time by start/end time. Omit `ended_time` to leave it running. Timestamps-mode accounts.                          |
| updateTimeEntry              | Update a time entry; only the fields you pass change.                                                                 |
| deleteTimeEntry              | Delete a time entry (locked/invoiced entries cannot be deleted).                                                      |
| restartTimer                 | Restart the timer on a stopped time entry.                                                                            |
| stopTimer                    | Stop the timer on a running time entry.                                                                               |
| listTimeEntries              | List time entries, filtered by user, project, client, task, date range, or state.                                     |
| getTimeEntry                 | Retrieve a single time entry by id.                                                                                   |

**Projects, clients, contacts, tasks**

| Script                      | Description                                                     |
| --------------------------- | --------------------------------------------------------------- |
| createProject               | Create a project for a client.                                  |
| updateProject               | Update a project (rename, re-budget, archive).                  |
| listProjects                | List projects, optionally filtered by client or active state.   |
| getProject                  | Retrieve a single project by id.                                |
| createClient                | Create a client.                                                |
| updateClient                | Update a client (rename, change currency, archive).             |
| listClients                 | List clients, optionally filtered by active state.              |
| getClient                   | Retrieve a single client by id.                                 |
| createContact               | Create a contact for a client.                                  |
| updateContact               | Update a contact.                                               |
| listContacts                | List contacts, optionally filtered by client.                   |
| deleteContact               | Delete a contact (hard delete).                                 |
| createTask                  | Create an account-wide task.                                    |
| listTasks                   | List the account's tasks.                                       |
| listProjectTaskAssignments  | List the tasks assigned to a project (valid `task_id`s for it). |
| createProjectTaskAssignment | Assign a task to a project so time can be logged against it.    |

**Invoices & account context (read)**

| Script         | Description                                                         |
| -------------- | ------------------------------------------------------------------- |
| listInvoices   | List invoices, optionally filtered by client, date range, or state. |
| getInvoice     | Retrieve a single invoice by id, including line items.              |
| getCurrentUser | Retrieve the authenticated user (default owner of a time entry).    |
| listUsers      | List users in the account.                                          |
| getCompany     | Retrieve company settings (time-tracking mode + feature flags).     |

<!-- END:readme-scripts-table -->

Run `npx @zapier/harvest-connector@latest run <script> --help` to see any script's exact input contract + the available resolvers.

## Usage

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function. Pass auth as one `[<resolver>:]<value>` string, e.g. `{ connection: "env:<ENV_VAR>" }`.

<!-- BEGIN:readme-usage-example -->

```ts
import { createTimeEntry } from "@zapier/harvest-connector";

// Log 1.5 hours against a project + task for a day (duration-mode account).
const { data, meta } = await createTimeEntry.run(
  { project_id: 12345, task_id: 67890, spent_date: "2026-07-30", hours: 1.5 },
  { connection: "token:HARVEST" },
);
// data is the created time entry; meta.outputDataValidation reports what was
// validated. Pass { skipOutputDataValidation: true } to receive the raw output.
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
- [Source](https://github.com/zapier/connectors/tree/main/apps/harvest)

<!-- BEGIN:readme-links-extra -->

- [Harvest API v2 documentation](https://help.getharvest.com/api-v2/)

<!-- END:readme-links-extra -->

<!-- BEGIN:readme-footer? -->
<!-- legal:footer -->

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Harvest's API, services, data, schemas, documentation, or other materials, which remain the property of Harvest. Your use of Harvest's API is governed by your own agreement with Harvest.

**Trademarks and affiliation.** Harvest and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Harvest.

**Your responsibility.** This connector calls Harvest's API using credentials you supply. You are responsible for holding a valid Harvest account, for complying with Harvest's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Harvest product. Zapier is not responsible for changes Harvest makes to its API or for any consequence of your use of Harvest's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
<!-- /legal:footer -->
<!-- END:readme-footer -->
