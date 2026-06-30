# @zapier/trello-connector

_Independent, unofficial connector for Trello. Not affiliated with, endorsed by, or sponsored by Trello. "Trello" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable scripts for the [Trello REST API](https://developer.atlassian.com/cloud/trello/rest/): create and move cards, manage boards and lists, labels and checklists, comments and attachments, and search — 44 scripts total. Auth is OAuth 1.0a via a Zapier-managed connection (recommended) or direct `TRELLO_API_KEY` + `TRELLO_TOKEN` env vars.

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

## When to use this

Use this connector when an agent needs to create or update Trello cards, organize boards and lists, manage labels and checklists, or search and read Trello data. It covers the common CRUD and lookup flows agents need for task boards and project tracking.

## When NOT to use this

- **Webhooks, automations, or Power-Ups** — not supported; use Trello's native Butler or Zapier Zaps instead.
- **Local file uploads** — only URL-based attachments; use Trello's UI or a file-hosting step first.
- **Enterprise admin or billing** — workspace policy and billing are outside this API surface.

## Install

```bash
# Run a script with zero install — npx fetches the package on first use
export <ENV_VAR_PREFIX>_API_KEY=xxx <ENV_VAR_PREFIX>_TOKEN=yyy
npx @zapier/trello-connector@latest run <script> '<input-json>' --connection env:<ENV_VAR_PREFIX>

# Install as a dependency to import the functions in your own code
npm install @zapier/trello-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills zapier/connectors --skill trello
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection`. The value is a _selector_, not the secret: `--connection zapier:<connection-id>` routes through Zapier-managed auth (recommended; no third-party secret enters the agent's environment, and the connection id isn't itself a secret so you can pass it as-is), and `--connection env:<ENV_VAR_PREFIX>` reads the API key and token from `$<ENV_VAR_PREFIX>_API_KEY` and `$<ENV_VAR_PREFIX>_TOKEN` (they stay in `env`, never on argv). The `<resolver>:` prefix is optional — a bare value is claimed by the first matching resolver. See [`SKILL.md`](SKILL.md#auth) for tradeoffs and how to find a connection ID.

### MCP server

Run the connector as an MCP server over stdio so any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) auto-discovers the scripts as tools — add one stanza to the client's config:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "trello": {
      "command": "npx",
      "args": ["@zapier/trello-connector", "mcp"]
    }
  }
}
```

`--connection` is optional — omit it to pass a connection per tool call, or add `"--connection", "zapier:<connection-id>"` (or `"env:<ENV_VAR_PREFIX>"` with `"env": { "<ENV_VAR_PREFIX>_API_KEY": "xxx", "<ENV_VAR_PREFIX>_TOKEN": "yyy" }`) to `args` to set a default.

## Scripts

| Script                   | Description                                                            |
| ------------------------ | ---------------------------------------------------------------------- |
| `createBoard`            | Create a new board in a workspace                                      |
| `copyBoard`              | Copy a board, optionally keeping cards                                 |
| `closeBoard`             | Archive (close) a board                                                |
| `getBoard`               | Get a board by id                                                      |
| `listBoards`             | List boards the authenticated member can access                        |
| `findBoard`              | Find boards by name                                                    |
| `listBoardMembers`       | List members of a board                                                |
| `addMemberToBoard`       | Add a member to a board by id or email                                 |
| `createList`             | Create a list on a board                                               |
| `getList`                | Get a list by id                                                       |
| `listLists`              | List all lists on a board                                              |
| `findList`               | Find lists on a board by name                                          |
| `createCard`             | Create a card on a list with optional members, labels, and attachments |
| `updateCard`             | Update card fields (name, description, due, cover, list)               |
| `archiveCard`            | Archive (close) a card                                                 |
| `moveCard`               | Move a card to another list or board                                   |
| `getCard`                | Get a card by id                                                       |
| `listCards`              | List cards on a board with optional filters                            |
| `searchCards`            | Search cards using Trello query DSL or structured filters              |
| `createComment`          | Add a comment to a card                                                |
| `getAction`              | Get an action (activity) by id                                         |
| `listCardAttachments`    | List attachments on a card                                             |
| `addCardAttachment`      | Add a URL attachment or link a remote file to a card                   |
| `createLabel`            | Create a label on a board                                              |
| `getLabel`               | Get a label by id                                                      |
| `listLabels`             | List labels on a board                                                 |
| `findLabel`              | Find labels on a board by name                                         |
| `addCardLabel`           | Add an existing label to a card                                        |
| `removeCardLabel`        | Remove a label from a card                                             |
| `createChecklist`        | Create a checklist on a card                                           |
| `getChecklist`           | Get a checklist by id                                                  |
| `deleteChecklist`        | Delete a checklist                                                     |
| `findChecklist`          | Find checklists on a card by name                                      |
| `addChecklistItem`       | Add an item to a checklist                                             |
| `getChecklistItem`       | Get a checklist item by id                                             |
| `findChecklistItem`      | Find checklist items by name                                           |
| `completeChecklistItem`  | Mark a checklist item complete or incomplete                           |
| `getCurrentMember`       | Get the authenticated member                                           |
| `getMember`              | Get a member by id                                                     |
| `findOrganizationMember` | Find members in a workspace                                            |
| `getOrganization`        | Get a workspace by id                                                  |
| `listOrganizations`      | List workspaces the member belongs to                                  |
| `addCardMember`          | Add a member to a card                                                 |
| `listCustomFields`       | List custom field definitions on a board                               |

Run `npx @zapier/trello-connector@latest run <script> --help` to see any script's exact input contract + the available resolvers.

## Usage

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function. Pass auth as one `[<resolver>:]<value>` string, e.g. `{ connection: "env:<ENV_VAR_PREFIX>" }`.

```ts
import { listBoards } from "@zapier/trello-connector";

const { data } = await listBoards({}, { connection: "env:TRELLO" });
// data.items → array of boards; meta.outputDataValidation reports any stripped fields.
```

## Links

- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Trello REST API docs](https://developer.atlassian.com/cloud/trello/rest/)
- [Source](https://github.com/zapier/connectors/tree/main/apps/trello)

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Trello's API, services, data, schemas, documentation, or other materials, which remain the property of Trello. Your use of Trello's API is governed by your own agreement with Trello.

**Trademarks and affiliation.** Trello and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Trello.

**Your responsibility.** This connector calls Trello's API using credentials you supply. You are responsible for holding a valid Trello account, for complying with Trello's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Trello product. Zapier is not responsible for changes Trello makes to its API or for any consequence of your use of Trello's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
