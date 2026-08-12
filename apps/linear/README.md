# @zapier/linear-connector

<!-- BEGIN:readme-intro -->

Agent-callable tools for [Linear](https://linear.app), wrapping the [Linear GraphQL API](https://linear.app/developers/graphql). It covers the day-to-day issue-tracking job: create and update issues, comment on them and attach links, find issues by identifier or filter, manage projects and post status updates, and resolve the teams, workflow states, labels, users, milestones, and cycles an agent needs to fill those records out — 22 scripts in all. Authenticate with a single connection string: a Linear personal API key (`LINEAR_API_KEY`) passed directly, or a Zapier-managed connection.

<!-- legal:disclaimer -->

_Independent, unofficial connector for Linear. Not affiliated with, endorsed by, or sponsored by Linear. "Linear" is a trademark of its owner, used only to identify the service this connector works with._
<!-- /legal:disclaimer -->
<!-- END:readme-intro -->

## When to use this

<!-- BEGIN:readme-when-to-use -->

Reach for this connector when an agent needs to read or write Linear issues and projects — open and triage issues, move them through workflow states, assign and label them, comment, and post project updates. It exposes Linear's workspace resolvers (teams, states, labels, users, cycles, milestones) as first-class tools, so an agent can turn a name into an id and act without a human clicking through a UI.
<!-- END:readme-when-to-use -->

## When NOT to use this

<!-- BEGIN:readme-when-not-to-use -->

- **Triggers / event subscriptions.** This connector is non-trigger by design; it does not subscribe to new-issue, comment, or project-update events.
- **Customer requests.** Creating or finding customers and their needs is not in this version.
- **Hard deletes.** There is no permanent delete for an issue — `archiveIssue` archives it reversibly.

<!-- END:readme-when-not-to-use -->

## Install

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

```bash
# Run a script with zero install — npx fetches the package on first use
export <ENV_VAR>=xxx
npx @zapier/linear-connector@latest run <script> '<input-json>' --connection env:<ENV_VAR>

# Install as a dependency to import the functions in your own code
npm install @zapier/linear-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills add zapier/connectors --skill linear
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection` — a _selector_, not the secret. The `<resolver>:` prefix is optional; a bare value is claimed by the first matching resolver. See [Auth](#auth) below for the with/without-Zapier tradeoffs and how to find a connection ID.

### MCP server

Run the connector as an MCP server over stdio so any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) auto-discovers the scripts as tools — add one stanza to the client's config:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["@zapier/linear-connector", "mcp"]
    }
  }
}
```

`--connection` is optional — omit it to pass a connection per tool call, or add `"--connection", "zapier:<connection-id>"` (or `"env:<ENV_VAR>"` with `"env": { "<ENV_VAR>": "xxx" }`) to `args` to set a default.

### Cloning the source

You don't need to clone anything to use this connector — the options above already cover that. Want the actual repo source instead, to read the script code, browse `references/`, run this connector's tests, or hack on it? Clone with a path filter so you only fetch this one connector, not the whole catalog:

```bash
git clone --filter=blob:none --sparse https://github.com/zapier/connectors.git
cd connectors && git sparse-checkout set apps/linear
cd apps/linear && npm install
```

See the [main README](https://github.com/zapier/connectors#cloning-the-source) to clone several connectors at once.

## Scripts

<!-- BEGIN:readme-scripts-table -->

| Script             | Description                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| `createIssue`      | Create a Linear issue in a team, with optional assignee, state, labels, project, cycle, priority, and due date. |
| `updateIssue`      | Update an existing issue's fields — title, description, state, assignee, priority, project, cycle, or due date. |
| `archiveIssue`     | Archive an issue — Linear's reversible "delete" (recoverable from the archive, not hard-deleted).               |
| `addIssueLabel`    | Add a single label to an issue without disturbing its other labels.                                             |
| `removeIssueLabel` | Remove a single label from an issue, leaving its other labels intact.                                           |
| `createComment`    | Post a Markdown comment on an issue.                                                                            |
| `createAttachment` | Attach a link (URL) to an issue — a related ticket, doc, or PR (link-based, not a file upload).                 |

**Issues — read**

| Script              | Description                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `getIssue`          | Fetch one issue by UUID or identifier, with its state, assignee, team, project, and labels.              |
| `searchIssues`      | Find issues by title text, assignee, state, team, project, or label; returns compact rows plus a cursor. |
| `listIssueComments` | List the comments on an issue; returns a page plus a cursor.                                             |

**Projects**

| Script                | Description                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| `createProject`       | Create a project in one or more teams, with an optional description, lead, and start/target dates. |
| `updateProject`       | Update a project's name, description, state, lead, or target date.                                 |
| `getProject`          | Fetch one project by id, with its name, description, url, and state.                               |
| `listProjects`        | List projects, optionally scoped to a team; resolves a project name to its id.                     |
| `createProjectUpdate` | Post a status update to a project, with an optional health signal (onTrack, atRisk, offTrack).     |

**Workspace navigation (resolvers)**

| Script                  | Description                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `listTeams`             | List the workspace's teams; resolves a team name or key to its id.                     |
| `listWorkflowStates`    | List a team's workflow states (statuses); resolves a status name to its id.            |
| `listLabels`            | List issue labels, optionally scoped to a team; resolves a label name to its id.       |
| `listUsers`             | List workspace users; resolves a name or email to a user id for `assigneeId`.          |
| `listProjectMilestones` | List a project's milestones; resolves a milestone name to its id.                      |
| `listCycles`            | List a team's cycles (sprints); resolves a cycle to its id, or find the current cycle. |
| `getViewer`             | Return the authenticated user (the "me" identity) — id, name, email.                   |

<!-- END:readme-scripts-table -->

Run `npx @zapier/linear-connector@latest run <script> --help` to see any script's exact input contract + the available resolvers.

## Usage

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function. Pass auth as one `[<resolver>:]<value>` string, e.g. `{ connection: "env:<ENV_VAR>" }`.

<!-- BEGIN:readme-usage-example -->

```ts
import { createIssue } from "@zapier/linear-connector";

const { data, meta } = await createIssue(
  {
    teamId: "e7f3b2a0-1c4d-4e8a-9f2b-6a1c3d5e7f90", // resolve with listTeams
    title: "Investigate flaky checkout test",
    description: "Fails ~1 in 5 runs on CI. See attached logs.",
    priority: 2, // 0 none, 1 urgent, 2 high, 3 medium, 4 low
  },
  { connection: "env:LINEAR_API_KEY" },
);

console.log(data.identifier, data.url); // e.g. "ENG-118", "https://linear.app/…"
console.log(meta.outputDataValidation); // { skipped: false, droppedPaths: null }
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
- [Source](https://github.com/zapier/connectors/tree/main/apps/linear)

<!-- BEGIN:readme-links-extra -->

- [Linear GraphQL API docs](https://linear.app/developers/graphql)

<!-- END:readme-links-extra -->

<!-- BEGIN:readme-footer? -->
<!-- legal:footer -->

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Linear's API, services, data, schemas, documentation, or other materials, which remain the property of Linear. Your use of Linear's API is governed by your own agreement with Linear.

**Trademarks and affiliation.** Linear and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Linear.

**Your responsibility.** This connector calls Linear's API using credentials you supply. You are responsible for holding a valid Linear account, for complying with Linear's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Linear product. Zapier is not responsible for changes Linear makes to its API or for any consequence of your use of Linear's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
<!-- /legal:footer -->
<!-- END:readme-footer -->
