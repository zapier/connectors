# @zapier/microsoft-outlook-connector

_Independent, unofficial connector for Microsoft Outlook. Not affiliated with, endorsed by, or sponsored by Microsoft Outlook. "Microsoft Outlook" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable Microsoft Outlook tools that wrap the [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/api/overview) v1.0 for a single user's mailbox: read and search mail, compose/send/reply/forward, organize messages (read state, flag, importance, categories, move, copy, delete), browse mail folders and attachments, manage calendar events, and manage personal contacts — 30 scripts across mail, folders, categories, calendar, and contacts. Use when the user mentions Outlook, Microsoft 365 mail/calendar/contacts, or wants to send, read, search, or organize email, schedule events, or look up contacts — even if they don't name Outlook explicitly. Every call authorizes with a single OAuth 2.0 bearer token, supplied either through Zapier-managed auth or as a direct Graph access token.

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

## When to use this

- An agent needs to act on one user's Outlook mailbox: read or search mail, send/reply/forward, organize messages and folders, work with attachments, manage calendar events, or manage personal contacts.
- You want request/response tools (call → result), addressable by id, optionally targeting a shared mailbox or a specific calendar.

## When NOT to use this

- **Triggers / change notifications** — there is no "watch for new mail/events" or webhook subscription here; the connector is request/response only.
- **Large attachments (≥3 MB)** — only inline attachments under 3 MB are supported; large-file upload sessions are not.
- **Group/shared _calendars_, distribution lists, mailbox rules, or auto-replies** — out of scope. (Shared _mailboxes_ are supported via the `mailbox` input.)

## Install

```bash
# Run a script with zero install — npx fetches the package on first use
export <ENV_VAR>=xxx
npx @zapier/microsoft-outlook-connector@latest run <script> '<input-json>' --connection env:<ENV_VAR>

# Install as a dependency to import the functions in your own code
npm install @zapier/microsoft-outlook-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills zapier/connectors --skill microsoft-outlook
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection`. The value is a _selector_, not the secret: `--connection zapier:<connection-id>` routes through Zapier-managed auth (recommended; no third-party secret enters the agent's environment, and the connection id isn't itself a secret so you can pass it as-is), and `--connection env:<ENV_VAR>` reads a direct token from `$<ENV_VAR>` (the token stays in `env`, never on argv). The `<resolver>:` prefix is optional — a bare value is claimed by the first matching resolver. See [`SKILL.md`](SKILL.md#auth) for tradeoffs and how to find a connection ID.

### MCP server

Run the connector as an MCP server over stdio so any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) auto-discovers the scripts as tools — add one stanza to the client's config:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "microsoft-outlook": {
      "command": "npx",
      "args": ["@zapier/microsoft-outlook-connector", "mcp"]
    }
  }
}
```

`--connection` is optional — omit it to pass a connection per tool call, or add `"--connection", "zapier:<connection-id>"` (or `"env:<ENV_VAR>"` with `"env": { "<ENV_VAR>": "xxx" }`) to `args` to set a default.

## Scripts

All scripts use the single connection `microsoft-outlook`. Mail and calendar scripts accept an optional `mailbox` input (shared mailbox); the six event scripts accept an optional `calendarId`.

**Profile**

| Script  | Description                                                                     |
| ------- | ------------------------------------------------------------------------------- |
| `getMe` | Get the signed-in user's profile (name, email, UPN); doubles as the auth probe. |

**Mail — compose & send**

| Script             | Description                                                 |
| ------------------ | ----------------------------------------------------------- |
| `sendMail`         | Compose and send an email in one step (returns no id).      |
| `createDraft`      | Create a draft email; returns the draft id for `sendDraft`. |
| `sendDraft`        | Send an existing draft by id.                               |
| `replyToMessage`   | Reply (or reply-all) to a message and send immediately.     |
| `createReplyDraft` | Create a draft reply (or reply-all) to edit before sending. |
| `forwardMessage`   | Forward a message to new recipients and send immediately.   |

**Mail — organize & read**

| Script             | Description                                                            |
| ------------------ | ---------------------------------------------------------------------- |
| `updateMessage`    | Update read state, flag, importance, or categories on a message.       |
| `moveMessage`      | Move a message to another folder (returns a new id).                   |
| `copyMessage`      | Copy a message into another folder, leaving the original.              |
| `deleteMessage`    | Delete a message (moves it to Deleted Items; reversible).              |
| `listMessages`     | List or search messages, newest first (the id-resolution entry point). |
| `getMessage`       | Get a single message by id, including the full body.                   |
| `listAttachments`  | List the attachments on a message.                                     |
| `getAttachment`    | Get one attachment by id, including its base64 content.                |
| `listMailFolders`  | List mail folders (top-level or a folder's subfolders).                |
| `createMailFolder` | Create a mail folder (top-level or a subfolder).                       |
| `listCategories`   | List the mailbox's category names and colors.                          |

**Calendar**

| Script             | Description                                             |
| ------------------ | ------------------------------------------------------- |
| `listCalendars`    | List the user's calendars (resolves a `calendarId`).    |
| `listEvents`       | List events and recurring-series masters.               |
| `listCalendarView` | List events in a date range, expanding recurrences.     |
| `getEvent`         | Get a single event by id (attendees, body, recurrence). |
| `createEvent`      | Create a calendar event.                                |
| `updateEvent`      | Update an event's fields or attendees.                  |
| `deleteEvent`      | Delete (cancel) a calendar event.                       |

**Contacts**

| Script          | Description                          |
| --------------- | ------------------------------------ |
| `listContacts`  | List or search personal contacts.    |
| `getContact`    | Get a single personal contact by id. |
| `createContact` | Create a personal contact.           |
| `updateContact` | Update fields on a personal contact. |
| `deleteContact` | Delete a personal contact by id.     |

Run `npx @zapier/microsoft-outlook-connector@latest run <script> --help` to see any script's exact input contract + the available resolvers.

## Usage

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function. Pass auth as one `[<resolver>:]<value>` string, e.g. `{ connection: "env:<ENV_VAR>" }`.

```ts
import { listMessages } from "@zapier/microsoft-outlook-connector";

// Each named export is the consumer-facing (input, opts) => Promise<{ data, meta }>.
// Pass auth as one `[<resolver>:]<value>` string.
const { data } = await listMessages(
  { search: "subject:invoice", limit: 5 },
  { connection: "env:MICROSOFT_OUTLOOK_ACCESS_TOKEN" },
);
// data => { items: [{ id, subject, from, receivedDateTime, ... }], next_cursor? }
```

## Links

- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Source](https://github.com/zapier/connectors/tree/main/apps/microsoft-outlook)
- [Microsoft Graph API reference](https://learn.microsoft.com/en-us/graph/api/overview) — the underlying vendor API

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Microsoft Outlook's API, services, data, schemas, documentation, or other materials, which remain the property of Microsoft Outlook. Your use of Microsoft Outlook's API is governed by your own agreement with Microsoft Outlook.

**Trademarks and affiliation.** Microsoft Outlook and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Microsoft Outlook.

**Your responsibility.** This connector calls Microsoft Outlook's API using credentials you supply. You are responsible for holding a valid Microsoft Outlook account, for complying with Microsoft Outlook's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Microsoft Outlook product. Zapier is not responsible for changes Microsoft Outlook makes to its API or for any consequence of your use of Microsoft Outlook's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
