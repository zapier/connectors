---
name: harvest
description: Agent-callable Harvest tools — track time (log hours, start/stop timers), and manage the projects, clients, contacts, and tasks time is logged against, plus read invoices and account settings. Use when the user wants to log or edit time, manage Harvest projects/clients/tasks, or check what was billed — even if they don't name Harvest explicitly.
license: Elastic-2.0
compatibility: Run `npm install --omit=dev` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for build-it-yourself / prebuilt / alternative-runtime options.
metadata:
  source: https://github.com/zapier/connectors/blob/main/apps/harvest/SKILL.md
  title: Harvest
  api-docs: https://help.getharvest.com/api-v2/
  zapier-app-key: HarvestCLIAPI
---

# Harvest

<!-- BEGIN:skill-intro -->

_Independent, unofficial connector for Harvest. Not affiliated with, endorsed by, or sponsored by Harvest. "Harvest" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable tools for [Harvest](https://help.getharvest.com/api-v2/), the time-tracking and project-billing service. Track time (log hours by duration or by start/end time, start and stop timers), and manage the projects, clients, contacts, and tasks that time is logged against. Also covers read access to invoices and the account-context reads (current user, company settings) that determine how time is tracked. Wraps the Harvest API v2 (`https://api.harvestapp.com/v2/`).

<!-- legal:disclaimer -->

_Independent, unofficial connector for Harvest. Not affiliated with, endorsed by, or sponsored by Harvest. "Harvest" is a trademark of its owner, used only to identify the service this connector works with._
<!-- /legal:disclaimer -->
<!-- END:skill-intro -->

## When to use this

<!-- BEGIN:skill-use-cases -->

- **Logging and editing time** — create, update, or delete time entries; start, stop, and restart timers. Harvest tracks time in one of two mutually exclusive modes (by duration or by start/end timestamps); read `getCompany` first when the mode is unknown (see [`references/harvest-api-gotchas.md`](references/harvest-api-gotchas.md)).
- **Setting up what time is logged against** — create and manage projects, clients, contacts, and tasks, and assign tasks to projects (a project references a task through a project task assignment, which governs how that task bills on the project).
- **Reading time, projects, and billing** — list and get time entries, projects, clients, contacts, tasks, and invoices; answer "what did we log / bill for this client or project".
- **Account context** — read the current user (the default owner of a time entry) and company settings (time-tracking mode, feature flags).

**Not for:** creating or sending invoices/estimates, logging expenses, running the aggregate Reports API, or user administration — those are out of scope for this connector.

<!-- END:skill-use-cases -->

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

If the connector has not been installed as a skill yet, install it first with `npx skills add zapier/connectors --skill harvest` (or your harness's own skill-install mechanism), then continue here. Installing the skill copies these files, not dependencies. Before running the CLI, a local MCP server, or `zapier-sdk` auth commands, run `npm install --omit=dev` here once. Importing the published package as a dependency in your own project instead? That `npm install` already resolves everything — see [`references/use-as-sdk.md`](references/use-as-sdk.md).

Want the actual repo source instead — to browse `references/`, run this connector's tests, or hack on it? See [`README.md`](README.md#cloning-the-source) for a scoped `git clone`.

The connector runs on **Node.js 22.18+**. Pick the reference that matches how you're running it, and load it before doing anything else:

| You have...                                                                                                                                                  | Load                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| An MCP-aware client — tools may already be loaded (e.g. `mcp__harvest__<tool>`), or you can register a local server yourself (or guide the user to)          | [`references/use-as-mcp.md`](references/use-as-mcp.md)       |
| Terminal / subprocess access (you can run `node`)                                                                                                            | [`references/use-as-cli.md`](references/use-as-cli.md)       |
| Only your own code, importing this package as a dependency                                                                                                   | [`references/use-as-sdk.md`](references/use-as-sdk.md)       |
| No tool access, no terminal, no ability to import this package — you write your own code that calls the Harvest API directly (e.g. a code-execution sandbox) | [`references/use-as-recipe.md`](references/use-as-recipe.md) |

## Scripts

<!-- BEGIN:skill-connections-note -->

All scripts use the single `harvest` connection. Ids (`id`, `project_id`, `task_id`, `client_id`, `user_id`) are integers; resolve them from the matching `list*` tool.

<!-- END:skill-connections-note -->

<!-- BEGIN:skill-scripts-table -->

| Script                                    | Script name                  | Connections | Description                                                                                                                      |
| ----------------------------------------- | ---------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/createTimeEntry.ts`              | createTimeEntry              | harvest     | Log time by duration (hours) against a project + task. Omit `hours` to start a running timer. Duration-mode accounts only.       |
| `scripts/createTimeEntryForTimestamps.ts` | createTimeEntryForTimestamps | harvest     | Log time by start/end time against a project + task. Omit `ended_time` to leave it running. Timestamps-mode accounts only.       |
| `scripts/updateTimeEntry.ts`              | updateTimeEntry              | harvest     | Update a time entry (notes, hours, times, task, or day). Only the fields you pass change.                                        |
| `scripts/deleteTimeEntry.ts`              | deleteTimeEntry              | harvest     | Delete a time entry. Locked/invoiced entries cannot be deleted.                                                                  |
| `scripts/restartTimer.ts`                 | restartTimer                 | harvest     | Restart the timer on a stopped time entry.                                                                                       |
| `scripts/stopTimer.ts`                    | stopTimer                    | harvest     | Stop the timer on a running time entry.                                                                                          |
| `scripts/listTimeEntries.ts`              | listTimeEntries              | harvest     | List time entries, filtered by user, project, client, task, date range, or running/billed/approval state.                        |
| `scripts/getTimeEntry.ts`                 | getTimeEntry                 | harvest     | Retrieve a single time entry by id.                                                                                              |
| `scripts/createProject.ts`                | createProject                | harvest     | Create a project for a client.                                                                                                   |
| `scripts/updateProject.ts`                | updateProject                | harvest     | Update a project (rename, re-budget, archive via `is_active: false`).                                                            |
| `scripts/listProjects.ts`                 | listProjects                 | harvest     | List projects, optionally filtered by client or active state. Source of `project_id`.                                            |
| `scripts/getProject.ts`                   | getProject                   | harvest     | Retrieve a single project by id.                                                                                                 |
| `scripts/createClient.ts`                 | createClient                 | harvest     | Create a client.                                                                                                                 |
| `scripts/updateClient.ts`                 | updateClient                 | harvest     | Update a client (rename, change currency, archive via `is_active: false`).                                                       |
| `scripts/listClients.ts`                  | listClients                  | harvest     | List clients, optionally filtered by active state. Source of `client_id`.                                                        |
| `scripts/getClient.ts`                    | getClient                    | harvest     | Retrieve a single client by id.                                                                                                  |
| `scripts/createContact.ts`                | createContact                | harvest     | Create a contact for a client.                                                                                                   |
| `scripts/updateContact.ts`                | updateContact                | harvest     | Update a contact.                                                                                                                |
| `scripts/listContacts.ts`                 | listContacts                 | harvest     | List client contacts, optionally filtered by client.                                                                             |
| `scripts/deleteContact.ts`                | deleteContact                | harvest     | Delete a contact (hard delete).                                                                                                  |
| `scripts/createTask.ts`                   | createTask                   | harvest     | Create an account-wide task. A project references it through a project task assignment (createProjectTaskAssignment).            |
| `scripts/listTasks.ts`                    | listTasks                    | harvest     | List the account's tasks. For tasks valid on a specific project, use listProjectTaskAssignments.                                 |
| `scripts/listProjectTaskAssignments.ts`   | listProjectTaskAssignments   | harvest     | List the tasks assigned to a project — the valid `task_id`s for logging time on it.                                              |
| `scripts/createProjectTaskAssignment.ts`  | createProjectTaskAssignment  | harvest     | Assign a task to a project so time can be logged against it.                                                                     |
| `scripts/listInvoices.ts`                 | listInvoices                 | harvest     | List invoices, optionally filtered by client, date range, or state. Read-only.                                                   |
| `scripts/getInvoice.ts`                   | getInvoice                   | harvest     | Retrieve a single invoice by id, including line items. Read-only.                                                                |
| `scripts/getCurrentUser.ts`               | getCurrentUser               | harvest     | Retrieve the authenticated user (the default owner of a time entry; timezone, roles).                                            |
| `scripts/listUsers.ts`                    | listUsers                    | harvest     | List users in the account (to log or read time for a specific teammate).                                                         |
| `scripts/getCompany.ts`                   | getCompany                   | harvest     | Retrieve company settings — most importantly `wants_timestamp_timers` (which time-entry create tool is valid) and feature flags. |

<!-- END:skill-scripts-table -->

<!-- BEGIN:disambiguation-and-refusals? -->

## Disambiguation & refusals

- **Resolving a project, client, task, or contact by name before writing.** Names collide — two projects can share a name, two clients can too, and a contact name can repeat across clients. Before creating or updating a record against a name-matched id, count the _exact_ (case-insensitive) matches from `listProjects` / `listClients` / `listTasks` / `listContacts`: exactly one → act on it, don't over-ask. Two or more that tie → stop, list the candidates with a distinguishing field (client name, code, or id) and ask which one. Never silently pick the first.
- **Picking the right time-entry create tool.** `createTimeEntry` (duration) and `createTimeEntryForTimestamps` (start/end) are mutually exclusive by account mode. If you don't know the account's mode, read `getCompany` (`wants_timestamp_timers`) before logging time rather than guessing — calling the wrong one returns a recoverable error naming its sibling.
- **Unsupported operations — decline, don't fake.** This connector does **not** create or send invoices or estimates, log expenses, run the aggregate Reports API, or create/archive users. If asked to do one of these, say it's not supported and stop — do not substitute a different tool (e.g. do not "log an expense" as a time entry) and report success for an action you didn't perform. There is no hard delete for clients, projects, or tasks — they are archived via `is_active: false`; don't claim a delete you can only archive.

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

| Reference                                                              | Covers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Load it when                                                                                                                                                |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [references/harvest-api-gotchas.md](references/harvest-api-gotchas.md) | The duration-vs-timestamps account mode and which time-entry create tool each allows (`wants_timestamp_timers`), running-timer creation and the state-guarded stop/restart, server-side hours rounding, delete-vs-archive constraints on clients/projects/time entries, required create fields, task/project task-assignment resolution, `is_active`/`updated_since` list filters, cursor pagination (follow `links.next`, `per_page` max 2000), auth headers, and the error envelope + rate limits (100 req / 15s) | a call is rejected unexpectedly, you're choosing between the two time-entry tools, a delete/archive behaves unexpectedly, or you're paginating a large list |

<!-- END:skill-references-table -->
