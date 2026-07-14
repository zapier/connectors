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

If the connector has not been installed as a skill yet, install it first with `npx skills add zapier/connectors --skill google-contacts` (or your harness's own skill-install mechanism), then continue here.

The connector runs on **Node.js 22.18+**. Pick the reference that matches how you're running it, and load it before doing anything else:

| You have...                                                                                                                                                          | Load                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| An MCP-aware client — tools may already be loaded (e.g. `mcp__google-contacts__<tool>`), or you can register a local server yourself (or guide the user to)          | [`references/use-as-mcp.md`](references/use-as-mcp.md)       |
| Terminal / subprocess access (you can run `node`)                                                                                                                    | [`references/use-as-cli.md`](references/use-as-cli.md)       |
| Only your own code, importing this package as a dependency                                                                                                           | [`references/use-as-sdk.md`](references/use-as-sdk.md)       |
| No tool access, no terminal, no ability to import this package — you write your own code that calls the Google Contacts API directly (e.g. a code-execution sandbox) | [`references/use-as-recipe.md`](references/use-as-recipe.md) |

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

Every shape passes auth as one connection **selector**, not the secret — a `[<resolver>:]<value>` string. Every connector accepts `zapier:<connection-id>` (Zapier-managed auth — routes through Zapier's auth, retries, and governance layer); some also accept one or more direct-token resolvers (naming and count vary per connector) — check this connector's own resolvers rather than assuming. The `<resolver>:` prefix is optional; a bare value goes to the first resolver that claims it. Each script declares the connections it needs and the resolvers each accepts. The exact syntax for passing a connection (and how to see this connector's resolver list) differs by shape — see the reference you loaded above.

Google Contacts uses OAuth 2.0. The connector needs Google "contacts" access (read/write); the other-contacts tools additionally need "other contacts" read access. On a `403`, reconnect with contacts access granted.

- **`zapier:<connection-id>`** _(recommended)_ — route through a Zapier-managed Google Contacts connection (`GOOGLE_CONTACTS_ZAPIER_CONNECTION_ID`); Zapier holds the OAuth credential and refreshes it automatically. Find the id with `npx zapier-sdk list-connections GoogleContactsCLIAPI`.
- **`env:GOOGLE_CONTACTS_ACCESS_TOKEN`** _(direct)_ — a Google OAuth access token sent as a bearer. Good for short-lived/testing use: Google access tokens expire ~1 hour after issue and this path does **not** refresh them, so the Zapier-managed connection is the durable choice.

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

- **Resolve names before writing.** Before `updateContact` / `deleteContact` / `modifyContactGroupMembers` on a contact identified by name, call `searchContacts` (or `listContacts`) and count _exact_, case-insensitive name matches. One match → act on it; don't over-ask. Two or more that tie → **stop, list the candidates with a distinguishing field (email or phone), and ask which one** — never silently pick. The same rule applies to groups via `listContactGroups`.
- **Editing a list field replaces it.** `updateContact` replaces each array you send (e.g. `emailAddresses`) wholesale. To _add_ a value without dropping the others, `getContact` first, append, then send the full array. For group membership, prefer `modifyContactGroupMembers` (element-level) over `updateContact`.
- **Out of scope — decline, don't substitute.** This connector does **not** do bulk/batch contact create-update-delete, Google Workspace **directory** lookups, or contact **merge/dedupe**. If asked for one of these, say it isn't supported and stop — do not call another tool and report it as done.
- **No bulk operations — never loop to fake one.** There is no batch endpoint. If asked to change, add, or delete a field across **many or all** contacts at once (e.g. "set everyone's company to Acme"), **decline and explain it isn't supported** — do **not** loop `updateContact` / `deleteContact` / `modifyContactGroupMembers` over multiple contacts to simulate a bulk operation. Acting on a single, explicitly-identified contact is fine; fanning out across the address book is not.

## References

Load the matching reference file before working in that area:

| Reference                                                                                | Covers                                                                                                                                                                                                                                   | Load it when          |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| [`references/google-contacts-api-gotchas.md`](references/google-contacts-api-gotchas.md) | Error codes, update replacement semantics, etag concurrency, search prefix matching + warmup, write propagation delay, resource name formats, contact group types, membership limits, other-contacts field restrictions, and pagination. | Before any tool call. |
