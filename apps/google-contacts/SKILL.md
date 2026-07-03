---
name: google-contacts
description: Agent-callable Google Contacts tools — create, find, update, and delete contacts, manage contact groups (labels) and membership, and read auto-saved other contacts. Use when the user mentions Google Contacts or wants to look up, save, or organize people — including requests that don't name Google Contacts explicitly, e.g. add Jane to my contacts, find Bob's email.
license: Elastic-2.0
compatibility: Run `npm install` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for prebuilt / alternative-runtime options.
metadata:
  title: Google Contacts
  source: https://github.com/zapier/connectors/blob/main/apps/google-contacts/SKILL.md
  zapier-app-key: GoogleContactsCLIAPI
  api-docs: https://developers.google.com/people/api/rest
---

# Google Contacts

_Independent, unofficial connector for Google Contacts. Not affiliated with, endorsed by, or sponsored by Google Contacts. "Google Contacts" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable tools for Google Contacts, wrapping the [Google People API](https://developers.google.com/people/api/rest). Create, read, update, and delete a person's contacts; search contacts by name, email, or phone; set or remove contact photos; create and manage contact groups (labels) and their membership; and browse the auto-saved "other contacts" surface. Every tool uses a single OAuth connection; capability is gated by the granted scope.

## When to use this

- Saving, finding, updating, or deleting a person's Google Contacts ("add Jane to my contacts", "what's Bob's email", "remove this contact").
- Organizing contacts into groups/labels and adding or removing members.
- Setting or removing a contact's photo.
- Finding someone the user has interacted with (e.g. emailed) but never explicitly saved — the "other contacts" surface — and promoting them into saved contacts.

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

**If this connector is already exposed to you as callable tools** (e.g. `mcp__google-contacts__<tool>`), that's a valid path — call them directly. Everything below is only for standalone terminal use when no such tools are loaded.

If the connector has not been installed as a skill yet, install it first with `npx skills zapier/connectors --skill google-contacts` (or your harness's own skill-install mechanism), then continue here.

The connector runs on **Node.js 22.18+** and needs a one-time `npm install` in this directory. `cli.js` is the entry point — list every script with `node cli.js --help`, then learn a script's inputs and connections with `node cli.js run <script> --help`. On older Node, run `node cli.js --help` anyway: it detects your runtime and prints how to run without upgrading (the prebuilt npm package, or another runtime) — don't skip the connector just because Node is old.

`cli.js` self-checks readiness before running: if dependencies aren't installed it exits non-zero with the exact install command (it disambiguates a read-only directory from a sandbox-blocked package cache). Run that, then re-run your command.

## Scripts

All scripts use the single `google-contacts` connection.

| Script                                                                         | Script name                 | Connections       | Description                                                                                |
| ------------------------------------------------------------------------------ | --------------------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| [`scripts/createContact.ts`](scripts/createContact.ts)                         | `createContact`             | `google-contacts` | Create a contact from structured name, email, phone, address, and organization fields.     |
| [`scripts/getContact.ts`](scripts/getContact.ts)                               | `getContact`                | `google-contacts` | Retrieve a single contact by resource name, with full field detail.                        |
| [`scripts/updateContact.ts`](scripts/updateContact.ts)                         | `updateContact`             | `google-contacts` | Update a contact; each array sent replaces that whole field, omitted fields are untouched. |
| [`scripts/deleteContact.ts`](scripts/deleteContact.ts)                         | `deleteContact`             | `google-contacts` | Delete a contact from the account.                                                         |
| [`scripts/listContacts.ts`](scripts/listContacts.ts)                           | `listContacts`              | `google-contacts` | List the account's contacts, paginated — the primary resourceName resolver.                |
| [`scripts/searchContacts.ts`](scripts/searchContacts.ts)                       | `searchContacts`            | `google-contacts` | Search contacts by name, nickname, email, phone, or organization (prefix match).           |
| [`scripts/updateContactPhoto.ts`](scripts/updateContactPhoto.ts)               | `updateContactPhoto`        | `google-contacts` | Set or replace a contact's photo from a base64-encoded image.                              |
| [`scripts/deleteContactPhoto.ts`](scripts/deleteContactPhoto.ts)               | `deleteContactPhoto`        | `google-contacts` | Remove a contact's photo, reverting to the default avatar.                                 |
| [`scripts/listContactGroups.ts`](scripts/listContactGroups.ts)                 | `listContactGroups`         | `google-contacts` | List contact groups (labels), user and system — the contactGroupResourceName resolver.     |
| [`scripts/getContactGroup.ts`](scripts/getContactGroup.ts)                     | `getContactGroup`           | `google-contacts` | Get a single contact group, optionally with its member contact resource names.             |
| [`scripts/createContactGroup.ts`](scripts/createContactGroup.ts)               | `createContactGroup`        | `google-contacts` | Create a new user contact group (label).                                                   |
| [`scripts/updateContactGroup.ts`](scripts/updateContactGroup.ts)               | `updateContactGroup`        | `google-contacts` | Rename a user contact group (system groups cannot be renamed).                             |
| [`scripts/deleteContactGroup.ts`](scripts/deleteContactGroup.ts)               | `deleteContactGroup`        | `google-contacts` | Delete a user contact group (label), optionally with its member contacts.                  |
| [`scripts/modifyContactGroupMembers.ts`](scripts/modifyContactGroupMembers.ts) | `modifyContactGroupMembers` | `google-contacts` | Add and/or remove contacts in a group without disturbing other memberships.                |
| [`scripts/listOtherContacts.ts`](scripts/listOtherContacts.ts)                 | `listOtherContacts`         | `google-contacts` | List auto-saved "other contacts" (people interacted with but never saved).                 |
| [`scripts/searchOtherContacts.ts`](scripts/searchOtherContacts.ts)             | `searchOtherContacts`       | `google-contacts` | Search "other contacts" by name, email, or phone (prefix match).                           |
| [`scripts/copyOtherContact.ts`](scripts/copyOtherContact.ts)                   | `copyOtherContact`          | `google-contacts` | Promote an "other contact" into saved contacts, returning an editable contact.             |

## Auth

Pass auth as one connection string with `--connection [<resolver>:]<value>`. The value is a selector, not the secret; the `<resolver>:` prefix is optional (a bare value goes to the first resolver that claims it). Each script declares the connections it needs and the resolvers each accepts — always run `node cli.js run <script> --help` to see them rather than relying on this file.

Google Contacts uses OAuth 2.0. The connector needs Google "contacts" access (read/write); the other-contacts tools additionally need "other contacts" read access. On a `403`, reconnect with contacts access granted.

- **`zapier:<connection-id>`** _(recommended)_ — route through a Zapier-managed Google Contacts connection (`GOOGLE_CONTACTS_ZAPIER_CONNECTION_ID`); Zapier holds the OAuth credential and refreshes it automatically. Find the id with `npx zapier-sdk list-connections GoogleContactsCLIAPI`.
- **`env:GOOGLE_CONTACTS_ACCESS_TOKEN`** _(direct)_ — a Google OAuth access token sent as a bearer. Good for short-lived/testing use: Google access tokens expire ~1 hour after issue and this path does **not** refresh them, so the Zapier-managed connection is the durable choice.

## Running scripts

After `npm install`, run a script by name with `node cli.js run <script>`, or execute its file directly — both take the same arguments and both accept `--help`. Always run a script's `--help` first to learn its exact input schema and connections, then invoke it:

```bash
# default — via the entry point; self-checks readiness and prints friendly diagnostics
node cli.js run <script> '<input-json>' --connection [<resolver>:]<value>
# shorthand — runs the script file directly (same args, same Node 22.18+ need, no readiness check)
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

- **Resolve names before writing.** Before `updateContact` / `deleteContact` / `modifyContactGroupMembers` on a contact identified by name, call `searchContacts` (or `listContacts`) and count _exact_, case-insensitive name matches. One match → act on it; don't over-ask. Two or more that tie → **stop, list the candidates with a distinguishing field (email or phone), and ask which one** — never silently pick. The same rule applies to groups via `listContactGroups`.
- **Editing a list field replaces it.** `updateContact` replaces each array you send (e.g. `emailAddresses`) wholesale. To _add_ a value without dropping the others, `getContact` first, append, then send the full array. For group membership, prefer `modifyContactGroupMembers` (element-level) over `updateContact`.
- **Out of scope — decline, don't substitute.** This connector does **not** do bulk/batch contact create-update-delete, Google Workspace **directory** lookups, or contact **merge/dedupe**. If asked for one of these, say it isn't supported and stop — do not call another tool and report it as done.
- **No bulk operations — never loop to fake one.** There is no batch endpoint. If asked to change, add, or delete a field across **many or all** contacts at once (e.g. "set everyone's company to Acme"), **decline and explain it isn't supported** — do **not** loop `updateContact` / `deleteContact` / `modifyContactGroupMembers` over multiple contacts to simulate a bulk operation. Acting on a single, explicitly-identified contact is fine; fanning out across the address book is not.

## References

Load the matching reference file before working in that area:

| Reference                                                                                | Covers                                                                                                                                                                                                                                   | Load it when          |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| [`references/google-contacts-api-gotchas.md`](references/google-contacts-api-gotchas.md) | Error codes, update replacement semantics, etag concurrency, search prefix matching + warmup, write propagation delay, resource name formats, contact group types, membership limits, other-contacts field restrictions, and pagination. | Before any tool call. |
