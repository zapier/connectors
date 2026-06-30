---
name: trello
description: Agent-callable Trello tools — create and update cards, manage boards, lists, labels, checklists, and search. Use when the user mentions Trello or wants to create cards, move tasks, or manage boards, even if they do not name Trello explicitly.
license: Elastic-2.0
compatibility: Requires Node.js 22.18+; run `npm install` in this directory first.
metadata:
  title: Trello
  source: https://github.com/zapier/connectors/blob/main/apps/trello/SKILL.md
  api-docs: https://developer.atlassian.com/cloud/trello/rest/
  zapier-app-key: TrelloAPI
---

# Trello

_Independent, unofficial connector for Trello. Not affiliated with, endorsed by, or sponsored by Trello. "Trello" is a trademark of its owner, used only to identify the service this connector works with._

Scripts for working with Trello against the [Trello REST API](https://developer.atlassian.com/cloud/trello/rest/) (`https://api.trello.com/1`): create and move cards, manage boards and lists, labels and checklists, comments and attachments, member lookups, and search. 44 scripts across boards, lists, cards, labels, checklists, members, and search.

## When to use this

- An agent needs to **create or update cards** — add tasks, set due dates, assign members, add labels, or archive/reopen cards.
- An agent needs to **organize boards** — create boards and lists, move cards between lists, copy boards, or close (archive) boards.
- An agent needs to **look up Trello resources by name** — find boards, lists, labels, or checklists before writing.
- An agent needs to **search cards** or read board/list/card detail for planning or reporting.

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

**If this connector is already exposed to you as callable tools** (e.g. `mcp__trello__<tool>`), that's a valid path — call them directly. Everything below is only for standalone terminal use when no such tools are loaded.

If the connector has not been installed as a skill yet, install it first with `npx skills zapier/connectors --skill trello` (or your harness's own skill-install mechanism), then continue here.

The connector runs on **Node.js 22.18+** and needs a one-time `npm install` in this directory. `cli.js` is the entry point — list every script with `node cli.js --help`, then learn a script's inputs and connections with `node cli.js run <script> --help`.

`cli.js` self-checks readiness before running: if dependencies aren't installed it exits non-zero with the exact install command (it disambiguates a read-only directory from a sandbox-blocked package cache). Run that, then re-run your command.

## Scripts

One file per script in [`scripts/`](scripts/); each script's `inputSchema` / `outputSchema` (Zod) in the script file is the source of truth for its contract. Shared helpers live in [`lib/trello.ts`](lib/trello.ts). All scripts use the single connection `trello`.

| Script                                                                   | Script name              | Connections       | Description                                                            |
| ------------------------------------------------------------------------ | ------------------------ | ----------------- | ---------------------------------------------------------------------- |
| [`scripts/createBoard.ts`](scripts/createBoard.ts)                       | `createBoard`            | Single (`trello`) | Create a new board in a workspace                                      |
| [`scripts/copyBoard.ts`](scripts/copyBoard.ts)                           | `copyBoard`              | Single (`trello`) | Copy a board, optionally keeping cards                                 |
| [`scripts/closeBoard.ts`](scripts/closeBoard.ts)                         | `closeBoard`             | Single (`trello`) | Archive (close) a board                                                |
| [`scripts/getBoard.ts`](scripts/getBoard.ts)                             | `getBoard`               | Single (`trello`) | Get a board by id                                                      |
| [`scripts/listBoards.ts`](scripts/listBoards.ts)                         | `listBoards`             | Single (`trello`) | List boards the authenticated member can access                        |
| [`scripts/findBoard.ts`](scripts/findBoard.ts)                           | `findBoard`              | Single (`trello`) | Find boards by name                                                    |
| [`scripts/listBoardMembers.ts`](scripts/listBoardMembers.ts)             | `listBoardMembers`       | Single (`trello`) | List members of a board                                                |
| [`scripts/addMemberToBoard.ts`](scripts/addMemberToBoard.ts)             | `addMemberToBoard`       | Single (`trello`) | Add a member to a board by id or email                                 |
| [`scripts/createList.ts`](scripts/createList.ts)                         | `createList`             | Single (`trello`) | Create a list on a board                                               |
| [`scripts/getList.ts`](scripts/getList.ts)                               | `getList`                | Single (`trello`) | Get a list by id                                                       |
| [`scripts/listLists.ts`](scripts/listLists.ts)                           | `listLists`              | Single (`trello`) | List all lists on a board                                              |
| [`scripts/findList.ts`](scripts/findList.ts)                             | `findList`               | Single (`trello`) | Find lists on a board by name                                          |
| [`scripts/createCard.ts`](scripts/createCard.ts)                         | `createCard`             | Single (`trello`) | Create a card on a list with optional members, labels, and attachments |
| [`scripts/updateCard.ts`](scripts/updateCard.ts)                         | `updateCard`             | Single (`trello`) | Update card fields (name, description, due, cover, list)               |
| [`scripts/archiveCard.ts`](scripts/archiveCard.ts)                       | `archiveCard`            | Single (`trello`) | Archive (close) a card                                                 |
| [`scripts/moveCard.ts`](scripts/moveCard.ts)                             | `moveCard`               | Single (`trello`) | Move a card to another list or board                                   |
| [`scripts/getCard.ts`](scripts/getCard.ts)                               | `getCard`                | Single (`trello`) | Get a card by id                                                       |
| [`scripts/listCards.ts`](scripts/listCards.ts)                           | `listCards`              | Single (`trello`) | List cards on a board with optional filters                            |
| [`scripts/searchCards.ts`](scripts/searchCards.ts)                       | `searchCards`            | Single (`trello`) | Search cards using Trello query DSL or structured filters              |
| [`scripts/createComment.ts`](scripts/createComment.ts)                   | `createComment`          | Single (`trello`) | Add a comment to a card                                                |
| [`scripts/getAction.ts`](scripts/getAction.ts)                           | `getAction`              | Single (`trello`) | Get an action (activity) by id                                         |
| [`scripts/listCardAttachments.ts`](scripts/listCardAttachments.ts)       | `listCardAttachments`    | Single (`trello`) | List attachments on a card                                             |
| [`scripts/addCardAttachment.ts`](scripts/addCardAttachment.ts)           | `addCardAttachment`      | Single (`trello`) | Add a URL attachment or link a remote file to a card                   |
| [`scripts/createLabel.ts`](scripts/createLabel.ts)                       | `createLabel`            | Single (`trello`) | Create a label on a board                                              |
| [`scripts/getLabel.ts`](scripts/getLabel.ts)                             | `getLabel`               | Single (`trello`) | Get a label by id                                                      |
| [`scripts/listLabels.ts`](scripts/listLabels.ts)                         | `listLabels`             | Single (`trello`) | List labels on a board                                                 |
| [`scripts/findLabel.ts`](scripts/findLabel.ts)                           | `findLabel`              | Single (`trello`) | Find labels on a board by name                                         |
| [`scripts/addCardLabel.ts`](scripts/addCardLabel.ts)                     | `addCardLabel`           | Single (`trello`) | Add an existing label to a card                                        |
| [`scripts/removeCardLabel.ts`](scripts/removeCardLabel.ts)               | `removeCardLabel`        | Single (`trello`) | Remove a label from a card                                             |
| [`scripts/createChecklist.ts`](scripts/createChecklist.ts)               | `createChecklist`        | Single (`trello`) | Create a checklist on a card                                           |
| [`scripts/getChecklist.ts`](scripts/getChecklist.ts)                     | `getChecklist`           | Single (`trello`) | Get a checklist by id                                                  |
| [`scripts/deleteChecklist.ts`](scripts/deleteChecklist.ts)               | `deleteChecklist`        | Single (`trello`) | Delete a checklist                                                     |
| [`scripts/findChecklist.ts`](scripts/findChecklist.ts)                   | `findChecklist`          | Single (`trello`) | Find checklists on a card by name                                      |
| [`scripts/addChecklistItem.ts`](scripts/addChecklistItem.ts)             | `addChecklistItem`       | Single (`trello`) | Add an item to a checklist                                             |
| [`scripts/getChecklistItem.ts`](scripts/getChecklistItem.ts)             | `getChecklistItem`       | Single (`trello`) | Get a checklist item by id                                             |
| [`scripts/findChecklistItem.ts`](scripts/findChecklistItem.ts)           | `findChecklistItem`      | Single (`trello`) | Find checklist items by name                                           |
| [`scripts/completeChecklistItem.ts`](scripts/completeChecklistItem.ts)   | `completeChecklistItem`  | Single (`trello`) | Mark a checklist item complete or incomplete                           |
| [`scripts/getCurrentMember.ts`](scripts/getCurrentMember.ts)             | `getCurrentMember`       | Single (`trello`) | Get the authenticated member                                           |
| [`scripts/getMember.ts`](scripts/getMember.ts)                           | `getMember`              | Single (`trello`) | Get a member by id                                                     |
| [`scripts/findOrganizationMember.ts`](scripts/findOrganizationMember.ts) | `findOrganizationMember` | Single (`trello`) | Find members in a workspace                                            |
| [`scripts/getOrganization.ts`](scripts/getOrganization.ts)               | `getOrganization`        | Single (`trello`) | Get a workspace by id                                                  |
| [`scripts/listOrganizations.ts`](scripts/listOrganizations.ts)           | `listOrganizations`      | Single (`trello`) | List workspaces the member belongs to                                  |
| [`scripts/addCardMember.ts`](scripts/addCardMember.ts)                   | `addCardMember`          | Single (`trello`) | Add a member to a card                                                 |
| [`scripts/listCustomFields.ts`](scripts/listCustomFields.ts)             | `listCustomFields`       | Single (`trello`) | List custom field definitions on a board                               |

**Resolve ids before writes.** Trello ids are 24-character hex strings. When the user names a board, list, or label, call the matching `find*` or `list*` script first and pass the returned id into create/update/move scripts — never guess ids.

**Always learn a script's input contract before calling it — never guess field names, casing, or types.** Run `node cli.js run <script> --help` (or `./scripts/<script>.ts --help`), which renders `inputSchema` as JSON Schema and lists the connection(s) and available resolvers. Guessing the payload just produces a `ZodError` and wastes a round-trip.

## Auth

Pass auth as one connection string with `--connection [<resolver>:]<value>`. The value is a selector, not the secret; the `<resolver>:` prefix is optional (a bare value goes to the first resolver that claims it). Each script declares the connections it needs and the resolvers each accepts — always run `node cli.js run <script> --help` to see them rather than relying on this file.

Trello uses **OAuth 1.0a** — every request carries an `Authorization: OAuth oauth_consumer_key="…", oauth_token="…"` header built from an API key plus access token. One connection slot (`trello`) holds both values. Two resolvers, Zapier-first:

- **`zapier:<connection-id>`** _(recommended)_ — route through a Zapier Trello connection. **Prerequisite: a Zapier account** (free signup at <https://zapier.com>, ~1 minute). The user authorizes Trello once via Zapier's OAuth flow; token refresh is handled for you. A bare UUID auto-claims this resolver. Find the ID with the Zapier SDK CLI: `npx @zapier/zapier-sdk-cli list-connections TrelloAPI` (run `login` first if unauthenticated; add `--json` for machine output).
- **`env:TRELLO`** _(fallback)_ — read credentials from **`TRELLO_API_KEY`** and **`TRELLO_TOKEN`** environment variables (both required; the prefix `TRELLO` maps to those two keys). Export both before calling — the secrets stay in `env`, never on argv.

If no connection is passed the script fails with an actionable error telling you to `Pass --connection [<resolver>:]<value>` and lists the resolvers in match order.

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

**Disambiguation before a write.** Before writing to a board, list, card, label, or checklist you looked up by name (e.g. create a card on a list found via `findList`, or add a label found via `findLabel`), count the **exact case-insensitive name matches**:

- **Exactly one match** — act on it. Don't over-ask; a single unambiguous match is the answer.
- **Two or more that tie** — stop. List the tied candidates with a distinguishing field (id + name + board/list context) and ask the user which one they mean. Don't pick arbitrarily and don't write to all of them.

**Unsupported operations — say so and stop; don't fake it with another script.** This catalog deliberately does not:

- **Manage webhooks, automations, or Power-Ups.** There are no trigger or Butler-rule scripts.
- **Upload local binary files.** `addCardAttachment` accepts a URL or remote file URL only — not a local path or base64 payload.
- **Permanently delete boards or cards.** `closeBoard` and `archiveCard` archive (soft-close) resources; there is no hard-delete script.
- **Manage workspace billing, admin settings, or enterprise policies.**

If asked for any of these, tell the user it's unsupported and stop — don't reach for an unrelated script to approximate it.

## References

Load the matching reference file before working in that area:

| Reference                                                            | Covers                                                                          | Load it when                                                                                                         |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [references/trello-api-gotchas.md](references/trello-api-gotchas.md) | Trello API behavior, id resolution patterns, rate limits, and search DSL quirks | Before search-heavy flows, rate-limit-sensitive loops, or any write that needs id resolution (lists, boards, labels) |
