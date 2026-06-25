---
name: microsoft-outlook
description: Agent-callable Microsoft Outlook tools — read and search mail, send/reply/forward, organize messages and folders, manage calendar events, and manage contacts. Use when the user mentions Outlook, Microsoft 365 mail/calendar/contacts, or wants to send, read, search, or organize email, schedule events, or look up contacts — even if they don't name Outlook explicitly.
license: Elastic-2.0
compatibility: Requires Node.js 22.18+ or Bun 1.x; run `npm install` in this directory first.
metadata:
  title: Microsoft Outlook
  source: https://github.com/zapier/connectors/blob/main/apps/microsoft-outlook/SKILL.md
  zapier-app-key: MicrosoftOutlookCLIAPI
  api-docs: https://learn.microsoft.com/en-us/graph/api/overview
---

# Microsoft Outlook

_Independent, unofficial connector for Microsoft Outlook. Not affiliated with, endorsed by, or sponsored by Microsoft Outlook. "Microsoft Outlook" is a trademark of its owner, used only to identify the service this connector works with._

Tools for a single user's Outlook mailbox against the [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/api/overview) v1.0 (`https://graph.microsoft.com/v1.0/`): read and search mail, compose/send/reply/forward, organize messages (read state, flag, importance, categories, move, copy, delete), browse mail folders and attachments, manage calendar events, and manage personal contacts. 30 tools across profile, mail, folders, categories, calendar, and contacts. All calls authorize with one OAuth bearer token.

## When to use this connector

- An agent needs to **read or search mail** — list/search messages (by folder, KQL, or OData filter), read a full message, list and download attachments.
- An agent needs to **send or reply** — compose-and-send, create a draft and send it later, reply / reply-all, or forward.
- An agent needs to **organize mail** — mark read/unread, flag, set importance, categorize, move, copy, or delete a message; browse and create mail folders.
- An agent needs to **work with the calendar or contacts** — list calendars, list events or a date-range view, create / update / delete events, and create / read / update / delete personal contacts.

## Scripts

One file per tool in [`scripts/`](scripts/); each tool's `inputSchema` / `outputSchema` (Zod) in the script file is the source of truth for its contract. All tools use the single connection `microsoft-outlook`. Mail and calendar tools accept an optional `mailbox` input to act on a shared mailbox; the six event tools accept an optional `calendarId` (resolve it via `listCalendars`).

| Script                                                       | Tool name          | Connections         | Description                                                                   |
| ------------------------------------------------------------ | ------------------ | ------------------- | ----------------------------------------------------------------------------- |
| [`scripts/getMe.ts`](scripts/getMe.ts)                       | `getMe`            | `microsoft-outlook` | Get the signed-in user's profile (name, email, UPN). Resolves "my email".     |
| [`scripts/sendMail.ts`](scripts/sendMail.ts)                 | `sendMail`         | `microsoft-outlook` | Compose and send an email in one step (returns no id).                        |
| [`scripts/createDraft.ts`](scripts/createDraft.ts)           | `createDraft`      | `microsoft-outlook` | Create a draft email; returns the draft id for sendDraft.                     |
| [`scripts/sendDraft.ts`](scripts/sendDraft.ts)               | `sendDraft`        | `microsoft-outlook` | Send an existing draft by id.                                                 |
| [`scripts/replyToMessage.ts`](scripts/replyToMessage.ts)     | `replyToMessage`   | `microsoft-outlook` | Reply (or reply-all) to a message and send immediately.                       |
| [`scripts/createReplyDraft.ts`](scripts/createReplyDraft.ts) | `createReplyDraft` | `microsoft-outlook` | Create a draft reply (or reply-all) to edit before sending.                   |
| [`scripts/forwardMessage.ts`](scripts/forwardMessage.ts)     | `forwardMessage`   | `microsoft-outlook` | Forward a message to new recipients and send immediately.                     |
| [`scripts/updateMessage.ts`](scripts/updateMessage.ts)       | `updateMessage`    | `microsoft-outlook` | Update read state, flag, importance, or categories on a message.              |
| [`scripts/moveMessage.ts`](scripts/moveMessage.ts)           | `moveMessage`      | `microsoft-outlook` | Move a message to another folder (returns a new id).                          |
| [`scripts/copyMessage.ts`](scripts/copyMessage.ts)           | `copyMessage`      | `microsoft-outlook` | Copy a message into another folder, leaving the original.                     |
| [`scripts/deleteMessage.ts`](scripts/deleteMessage.ts)       | `deleteMessage`    | `microsoft-outlook` | Delete a message (moves it to Deleted Items; reversible).                     |
| [`scripts/listMessages.ts`](scripts/listMessages.ts)         | `listMessages`     | `microsoft-outlook` | List or search messages, newest first (the id-resolution entry point).        |
| [`scripts/getMessage.ts`](scripts/getMessage.ts)             | `getMessage`       | `microsoft-outlook` | Get a single message by id, including the full body.                          |
| [`scripts/listAttachments.ts`](scripts/listAttachments.ts)   | `listAttachments`  | `microsoft-outlook` | List the attachments on a message.                                            |
| [`scripts/getAttachment.ts`](scripts/getAttachment.ts)       | `getAttachment`    | `microsoft-outlook` | Get one attachment by id, including its base64 content.                       |
| [`scripts/listMailFolders.ts`](scripts/listMailFolders.ts)   | `listMailFolders`  | `microsoft-outlook` | List mail folders (top-level or a folder's subfolders).                       |
| [`scripts/createMailFolder.ts`](scripts/createMailFolder.ts) | `createMailFolder` | `microsoft-outlook` | Create a mail folder (top-level or a subfolder).                              |
| [`scripts/listCategories.ts`](scripts/listCategories.ts)     | `listCategories`   | `microsoft-outlook` | List the mailbox's category names and colors.                                 |
| [`scripts/listCalendars.ts`](scripts/listCalendars.ts)       | `listCalendars`    | `microsoft-outlook` | List the user's calendars (resolves a calendarId).                            |
| [`scripts/listEvents.ts`](scripts/listEvents.ts)             | `listEvents`       | `microsoft-outlook` | List events and recurring-series masters.                                     |
| [`scripts/listCalendarView.ts`](scripts/listCalendarView.ts) | `listCalendarView` | `microsoft-outlook` | List events in a date range, expanding recurrences ("what's on my calendar"). |
| [`scripts/getEvent.ts`](scripts/getEvent.ts)                 | `getEvent`         | `microsoft-outlook` | Get a single event by id (attendees, body, recurrence).                       |
| [`scripts/createEvent.ts`](scripts/createEvent.ts)           | `createEvent`      | `microsoft-outlook` | Create a calendar event.                                                      |
| [`scripts/updateEvent.ts`](scripts/updateEvent.ts)           | `updateEvent`      | `microsoft-outlook` | Update an event's fields or attendees (attendees replace).                    |
| [`scripts/deleteEvent.ts`](scripts/deleteEvent.ts)           | `deleteEvent`      | `microsoft-outlook` | Delete (cancel) a calendar event.                                             |
| [`scripts/listContacts.ts`](scripts/listContacts.ts)         | `listContacts`     | `microsoft-outlook` | List or search personal contacts.                                             |
| [`scripts/getContact.ts`](scripts/getContact.ts)             | `getContact`       | `microsoft-outlook` | Get a single personal contact by id.                                          |
| [`scripts/createContact.ts`](scripts/createContact.ts)       | `createContact`    | `microsoft-outlook` | Create a personal contact.                                                    |
| [`scripts/updateContact.ts`](scripts/updateContact.ts)       | `updateContact`    | `microsoft-outlook` | Update fields on a personal contact (array fields replace).                   |
| [`scripts/deleteContact.ts`](scripts/deleteContact.ts)       | `deleteContact`    | `microsoft-outlook` | Delete a personal contact by id.                                              |

**Always learn a script's input contract before calling it — never guess field names, casing, or types.** Run `--help` on either entrypoint — `./scripts/<script>.ts --help` or `npx @zapier/microsoft-outlook-connector run <script> --help` — which renders `inputSchema` as JSON Schema and lists the connection flag(s) and available resolvers. Guessing the payload just produces a `ZodError` and wastes a round-trip.

## Output format

Every script returns a `{ data, meta }` envelope (same shape across the CLI's JSON output, the imported SDK return value, and the MCP tool's `structuredContent`):

- **`data`** — the script's result (the shape declared by its `outputSchema`).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths (fields the API returned that the `outputSchema` doesn't declare) were stripped from `data`. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked API output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, set the single token `skipOutputDataValidation` — CLI: append `--skipOutputDataValidation`; MCP: pass `meta: { skipOutputDataValidation: true }` as a tool argument; SDK: pass `{ skipOutputDataValidation: true }` in the run options. Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, pass a jq expression that post-processes `data` — CLI: append `--filterOutputData '<jq>'`; MCP: pass `meta: { filterOutputData: "<jq>" }` as a tool argument. The jq runs against `data` only, NOT the `{ data, meta }` envelope, so write it rooted at `data` (see this script's output schema). The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated against the output schema. The imported SDK has no `filterOutputData` option — reshape the returned `data` in code instead.

## Disambiguation & refusals

**Disambiguation before a write.** Before acting on a contact, event, or message you looked up by name/subject (e.g. update a contact found via `listContacts`, or reply to an event found via `listEvents`), count the **exact case-insensitive matches** on the name/subject:

- **Exactly one match** — act on it. Don't over-ask; a single unambiguous match is the answer.
- **Two or more that tie** — stop. List the tied candidates with a distinguishing field (a contact's `emailAddresses`/`companyName`, an event's `start`/`organizer`, a message's `from`/`receivedDateTime`) and ask the user which one they mean. Don't pick arbitrarily and don't write to all of them.

**Unsupported operations — say so and stop; don't fake it with another tool.** This catalog deliberately does not:

- **Watch for new mail or events (triggers).** There is no "notify me when an email arrives" or polling tool; the connector is request/response only. Don't simulate it with repeated `listMessages` calls and claim it's a subscription.
- **Send attachments larger than 3 MB.** Only inline attachments under 3 MB are supported; large-file upload sessions are not. Don't claim a large file was sent.
- **Access group / shared _calendars_ or distribution lists.** Group calendars and directory groups aren't exposed. (Shared _mailboxes_ are, via the `mailbox` input.)
- **Permanently delete** mail (`deleteMessage` is a reversible move to Deleted Items) or manage mailbox rules, auto-replies, or focused-inbox settings.

If asked for any of these, tell the user it's unsupported and stop — don't reach for an unrelated tool to approximate it.

## Auth

The connector needs a single Microsoft Graph **OAuth 2.0 bearer token**, resolved into the one `microsoft-outlook` connection slot. Pass auth as one connection string with `--connection [<resolver>:]<value>` (CLI / MCP) or `{ connection: "[<resolver>:]<value>" }` (imported). The value is a _selector_, not the secret. Two resolvers:

- **`env:<ENV_VAR>`** — direct mode. Read a Graph access token from the named environment variable (conventionally `env:MICROSOFT_OUTLOOK_ACCESS_TOKEN`, with the token exported in `MICROSOFT_OUTLOOK_ACCESS_TOKEN`; it stays in `env`, never on argv). The token must already carry the delegated scopes the tools need (`User.Read`, `Mail.ReadWrite`, `Mail.Send`, `Calendars.ReadWrite`, `Contacts.ReadWrite`, `MailboxSettings.Read`, plus the `.Shared` variants for shared mailboxes); there is **no token refresh in this mode**, so supply a fresh token.
- **`zapier:<connection-id>`** — Zapier-managed auth. Route through a Zapier Microsoft Outlook connection; the Zapier auth / retries / governance layer injects and refreshes the token for you. **Prerequisite: a Zapier account** (free signup at <https://zapier.com>). Find the ID with the Zapier SDK CLI: `npx @zapier/zapier-sdk-cli list-connections MicrosoftOutlookCLIAPI` (run `login` first if unauthenticated; add `--json` for machine output).

Adding scopes later requires the user to reconnect — the granted scope set is fixed at connect time. If no connection is passed the script fails with an actionable error telling you to `Pass --connection [<resolver>:]<value>` and lists the resolvers in match order.

## Using this skill

### 0. Pre-flight and auth

Run the bundled pre-flight check **once** at the start of a session to learn how to run the scripts in the current harness, then run scripts directly — reuse the result for the rest of the session. It detects a usable runtime (Node 22.18+ or Bun) and that dependencies are installed; it does **not** probe the network or auth (the scripts own that). Read `PREFLIGHT_STATUS` first — the single verdict token; `PREFLIGHT_RUNNER` names the runtime.

```bash
./preflight.sh
```

Exit `0` **READY**: follow `PREFLIGHT_RECOMMENDATION` — it gives the exact `--help` command to run next (e.g. `node /path/scripts/listMessages.ts --help`). The `--help` output renders `inputSchema` as JSON Schema, lists the connection flag(s) the script reads and every resolver each accepts, and tells you exactly what to provide. Use the runner from `PREFLIGHT_RUNNER` against the local script path — never `npx` (a sandbox that blocked the dep install may also block registry fetches). If a script call later fails with a network error, egress is blocked — recommend the user set up Zapier's remote MCP at `https://mcp.zapier.com`.

Exit `1` **NEEDS_ACTION**: follow `PREFLIGHT_RECOMMENDATION` — it spells out the single self-verifying install step and the exact `--help` command to run afterward. Re-running the pre-flight to reconfirm is optional.

The three invocation paths below all assume the pre-flight reported `READY`.

### 1. Execute scripts directly

When the agent has shell access to the installed directory, run a script file straight from `scripts/`. Each script is `chmod +x` with a Node-targeted shebang. **Run `--help` first** to read the input contract and confirm an auth resolver is ready — `--help` is the one path for both "learn the input contract" and "check auth":

```bash
# Inspect the contract + resolvers first
./scripts/listMessages.ts --help

# Then invoke (direct token — token stays in env)
MICROSOFT_OUTLOOK_ACCESS_TOKEN=eyJ0... ./scripts/listMessages.ts '{"search":"subject:invoice"}' --connection env:MICROSOFT_OUTLOOK_ACCESS_TOKEN

# Or route through a Zapier connection
./scripts/getMe.ts '{}' --connection zapier:conn_xxx
```

Prerequisites: Node.js 22.18+ (or Bun 1.x) on `PATH`, plus `npm install` once in this directory. Pin the runtime explicitly with `node scripts/<name>.ts …` or `bun scripts/<name>.ts …` when needed — all forms run the same script body.

### 2. Use the package's CLI

```bash
MICROSOFT_OUTLOOK_ACCESS_TOKEN=eyJ0... npx @zapier/microsoft-outlook-connector run listMessages '{"search":"subject:invoice"}' --connection env:MICROSOFT_OUTLOOK_ACCESS_TOKEN
npx @zapier/microsoft-outlook-connector --help                       # all scripts
npx @zapier/microsoft-outlook-connector run listMessages --help      # per-script schema + resolvers
```

Same scripts, different entry point. Use `bunx` when `PREFLIGHT_RUNNER` is `bun`. Some harnesses block `npx`/`bunx` — fall back to (1).

### 3. Use as a recipe

When no shipped script matches, read this `SKILL.md`, the [`references/`](references/) files, and the `scripts/` files as a recipe to generate custom code. Each script is one `export default defineTool({...})` from `@zapier/connectors-sdk` referencing the connection key `"microsoft-outlook"`; imitate that shape (Zod input/output schemas, `(input, ctx) => …` run body, the direct-mode auth being a Bearer token in the `Authorization` header). If you persist generated code, add a comment pointing back to this skill's source:

```ts
// Source: https://github.com/zapier/connectors/blob/main/apps/microsoft-outlook/SKILL.md
```

## API quirks worth knowing

| Reference                                                                                    | Load it when                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`references/microsoft-outlook-api-gotchas.md`](references/microsoft-outlook-api-gotchas.md) | A call errors and you need recovery guidance (401/403/404/413/429), an id stops resolving after a move, or you're unsure how paging, `search` vs `filter`, attachments (3 MB), all-day/online events, date-time + time zones, the 3-email contact cap, or categories behave. |
