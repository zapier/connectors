---
name: microsoft-outlook
description: Agent-callable Microsoft Outlook tools — read and search mail, send/reply/forward, organize messages and folders, manage calendar events, and manage contacts. Use when the user mentions Outlook, Microsoft 365 mail/calendar/contacts, or wants to send, read, search, or organize email, schedule events, or look up contacts — even if they don't name Outlook explicitly.
license: Elastic-2.0
compatibility: Run `npm install --omit=dev` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for build-it-yourself / prebuilt / alternative-runtime options.
metadata:
  title: Microsoft Outlook
  source: https://github.com/zapier/connectors/blob/main/apps/microsoft-outlook/SKILL.md
  zapier-app-key: MicrosoftOutlookCLIAPI
  api-docs: https://learn.microsoft.com/en-us/graph/api/overview
---

# Microsoft Outlook

_Independent, unofficial connector for Microsoft Outlook. Not affiliated with, endorsed by, or sponsored by Microsoft Outlook. "Microsoft Outlook" is a trademark of its owner, used only to identify the service this connector works with._

Tools for a single user's Outlook mailbox against the [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/api/overview) v1.0 (`https://graph.microsoft.com/v1.0/`): read and search mail, compose/send/reply/forward, organize messages (read state, flag, importance, categories, move, copy, delete), browse mail folders and attachments, manage calendar events, and manage personal contacts. 30 scripts across profile, mail, folders, categories, calendar, and contacts. All calls authorize with one OAuth bearer token.

## When to use this

- An agent needs to **read or search mail** — list/search messages (by folder, KQL, or OData filter), read a full message, list and download attachments.
- An agent needs to **send or reply** — compose-and-send, create a draft and send it later, reply / reply-all, or forward.
- An agent needs to **organize mail** — mark read/unread, flag, set importance, categorize, move, copy, or delete a message; browse and create mail folders.
- An agent needs to **work with the calendar or contacts** — list calendars, list events or a date-range view, create / update / delete events, and create / read / update / delete personal contacts.

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

If the connector has not been installed as a skill yet, install it first with `npx skills add zapier/connectors --skill microsoft-outlook` (or your harness's own skill-install mechanism), then continue here.

The connector runs on **Node.js 22.18+**. Pick the reference that matches how you're running it, and load it before doing anything else:

| You have...                                                                                                                                                          | Load                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| An MCP-aware client — tools may already be loaded (e.g. `mcp__microsoft-outlook__<tool>`), or you can register a local server yourself (or guide the user to)        | [`references/use-as-mcp.md`](references/use-as-mcp.md)       |
| Terminal / subprocess access (you can run `node`)                                                                                                                    | [`references/use-as-cli.md`](references/use-as-cli.md)       |
| Only your own code, importing this package as a dependency                                                                                                           | [`references/use-as-sdk.md`](references/use-as-sdk.md)       |
| No tool access, no terminal, no ability to import this package — you write your own code that calls the Microsoft Graph API directly (e.g. a code-execution sandbox) | [`references/use-as-recipe.md`](references/use-as-recipe.md) |

## Scripts

All scripts use the single connection `microsoft-outlook`. Mail and calendar scripts accept an optional `mailbox` input to act on a shared mailbox; the six event scripts accept an optional `calendarId` (resolve it via `listCalendars`).

| Script                                                       | Script name        | Connections         | Description                                                                   |
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

## Auth

Every shape passes auth as one connection **selector**, not the secret — a `[<resolver>:]<value>` string. Every connector accepts `zapier:<connection-id>` (Zapier-managed auth — routes through Zapier's auth, retries, and governance layer); some also accept one or more direct-token resolvers (naming and count vary per connector) — check this connector's own resolvers rather than assuming. The `<resolver>:` prefix is optional; a bare value goes to the first resolver that claims it. Each script declares the connections it needs and the resolvers each accepts. The exact syntax for passing a connection (and how to see this connector's resolver list) differs by shape — see the reference you loaded above.

The connector needs a single Microsoft Graph **OAuth 2.0 bearer token**, resolved into the one `microsoft-outlook` connection slot. Two resolvers:

- **`env:<ENV_VAR>`** — direct mode. A Graph access token (conventionally `MICROSOFT_OUTLOOK_ACCESS_TOKEN`) already carrying the delegated scopes the tools need (`User.Read`, `Mail.ReadWrite`, `Mail.Send`, `Calendars.ReadWrite`, `Contacts.ReadWrite`, `MailboxSettings.Read`, plus `Mail.ReadWrite.Shared`, `Mail.Send.Shared`, and `Calendars.ReadWrite.Shared` for shared mailboxes); there is **no token refresh in this mode**, so supply a fresh token.
- **`zapier:<connection-id>`** — Zapier-managed auth. Route through a Zapier Microsoft Outlook connection; the Zapier auth / retries / governance layer injects and refreshes the token for you. **Prerequisite: a Zapier account** (free signup at <https://zapier.com>). Find the ID with the Zapier SDK CLI: `npx zapier-sdk list-connections MicrosoftOutlookCLIAPI` (run `login` first if unauthenticated; add `--json` for machine output).

Adding scopes later requires the user to reconnect — the granted scope set is fixed at connect time.

## Output format

Every script returns a `{ data, meta }` envelope:

- **`data`** — the script's result (the shape its `outputSchema` declares; see the reference you loaded above for how to inspect a script's exact schema in your shape).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths were stripped from `data`: fields the script returned from the API that the `outputSchema` doesn't declare. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked script output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, opt out of output validation (the exact syntax differs by shape — see the reference you loaded above). Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, pass a jq expression that post-processes `data` (again, exact syntax per shape). The jq runs against `data` only, NOT the `{ data, meta }` envelope, so write it rooted at `data` (run the script's `--help` — or your shape's equivalent — to see its output schema). The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated against the output schema.

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

## References

Load the matching reference file before working in that area:

| Reference                                                                                    | Covers                                                                                                                                                                                                      | Load it when                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`references/microsoft-outlook-api-gotchas.md`](references/microsoft-outlook-api-gotchas.md) | API error recovery (401/403/404/413/429), id stability after moves, paging, `search` vs `filter`, attachments (3 MB limit), all-day/online events, date-time + time zones, 3-email contact cap, categories. | A call errors and you need recovery guidance, an id stops resolving after a move, or you're unsure how paging, `search` vs `filter`, attachments, all-day/online events, date-time + time zones, the 3-email contact cap, or categories behave. |
