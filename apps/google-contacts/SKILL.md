---
name: google-contacts
description: Agent-callable Google Contacts tools — create, find, update, and delete contacts, manage contact groups (labels) and membership, and read auto-saved other contacts. Use when the user mentions Google Contacts or wants to look up, save, or organize people — including requests that don't name Google Contacts explicitly, e.g. add Jane to my contacts, find Bob's email.
license: Elastic-2.0
compatibility: Requires Node.js 22.18+ or Bun 1.x; run `npm install` in this directory first.
metadata:
  title: Google Contacts
  source: https://github.com/zapier/connectors/blob/main/apps/google-contacts/SKILL.md
  zapier-app-key: GoogleContactsCLIAPI
  api-docs: https://developers.google.com/people/api/rest
---

# Google Contacts

_Independent, unofficial connector for Google Contacts. Not affiliated with, endorsed by, or sponsored by Google Contacts. "Google Contacts" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable tools for Google Contacts, wrapping the [Google People API](https://developers.google.com/people/api/rest). Create, read, update, and delete a person's contacts; search contacts by name, email, or phone; set or remove contact photos; create and manage contact groups (labels) and their membership; and browse the auto-saved "other contacts" surface. Every tool uses a single OAuth connection; capability is gated by the granted scope.

## When to use this connector

- Saving, finding, updating, or deleting a person's Google Contacts ("add Jane to my contacts", "what's Bob's email", "remove this contact").
- Organizing contacts into groups/labels and adding or removing members.
- Setting or removing a contact's photo.
- Finding someone the user has interacted with (e.g. emailed) but never explicitly saved — the "other contacts" surface — and promoting them into saved contacts.

## Scripts

One file per tool in [`scripts/`](scripts/); each tool's `inputSchema` / `outputSchema` (Zod) in the script file is the source of truth for its contract. All tools use the single connection `google-contacts`.

| Script                                                                         | Tool name                   | Connections       | Description                                                                                |
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

## Disambiguation & refusals

- **Resolve names before writing.** Before `updateContact` / `deleteContact` / `modifyContactGroupMembers` on a contact identified by name, call `searchContacts` (or `listContacts`) and count _exact_, case-insensitive name matches. One match → act on it; don't over-ask. Two or more that tie → **stop, list the candidates with a distinguishing field (email or phone), and ask which one** — never silently pick. The same rule applies to groups via `listContactGroups`.
- **Editing a list field replaces it.** `updateContact` replaces each array you send (e.g. `emailAddresses`) wholesale. To _add_ a value without dropping the others, `getContact` first, append, then send the full array. For group membership, prefer `modifyContactGroupMembers` (element-level) over `updateContact`.
- **Out of scope — decline, don't substitute.** This connector does **not** do bulk/batch contact create-update-delete, Google Workspace **directory** lookups, or contact **merge/dedupe**. If asked for one of these, say it isn't supported and stop — do not call another tool and report it as done.

## Output format

Every script returns a `{ data, meta }` envelope (same shape across the CLI's JSON output, the imported SDK return value, and the MCP tool's `structuredContent`):

- **`data`** — the script's result (the shape declared by its `outputSchema`).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths (fields the API returned that the `outputSchema` doesn't declare) were stripped from `data`. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked API output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, set the single token `skipOutputDataValidation` — CLI: append `--skipOutputDataValidation`; MCP: pass `meta: { skipOutputDataValidation: true }` as a tool argument; SDK: pass `{ skipOutputDataValidation: true }` in the run options. Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, pass a jq expression that post-processes `data` — CLI: append `--filterOutputData '<jq>'`; MCP: pass `meta: { filterOutputData: "<jq>" }` as a tool argument. The jq runs against `data` only, NOT the `{ data, meta }` envelope, so write it rooted at `data` (see this script's output schema). The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated against the output schema. The imported SDK has no `filterOutputData` option — reshape the returned `data` in code instead.

## Auth

Google Contacts uses OAuth 2.0. The connector needs Google "contacts" access (read/write); the other-contacts tools additionally need "other contacts" read access. On a `403`, reconnect with contacts access granted. Two ways to supply the credential:

- **Zapier-managed (recommended):** `--connection zapier:<connection-id>` — Zapier holds the OAuth credential and refreshes it automatically. Set `GOOGLE_CONTACTS_ZAPIER_CONNECTION_ID` to select the connection.
- **Direct token:** `--connection env:GOOGLE_CONTACTS_ACCESS_TOKEN` — a Google OAuth access token sent as a bearer. Good for short-lived/testing use: Google access tokens expire ~1 hour after issue and this path does **not** refresh them, so the Zapier-managed connection is the durable choice.

Pass auth as one connection string with `--connection [<resolver>:]<value>` (CLI / MCP) or `{ connection: "[<resolver>:]<value>" }` (imported). The value is a selector, not the secret; the `<resolver>:` prefix is optional (a bare value goes to the first resolver that claims it).

## Using this skill

### 0. Pre-flight and auth

Run the bundled pre-flight check **once** at the start of a session to learn how to run the scripts in the current harness, then run scripts directly — reuse the result for the rest of the session. It detects a usable runtime (Node 22.18+ or Bun) and that dependencies are installed; it does **not** probe the network or auth (the scripts own that). Read `PREFLIGHT_STATUS` first — the single verdict token; `PREFLIGHT_RUNNER` names the runtime.

```bash
./preflight.sh
```

Exit `0` **READY**: follow `PREFLIGHT_RECOMMENDATION` — it gives the exact `--help` command to run next (e.g. `node /path/scripts/<name>.ts --help`). The `--help` output lists the connection flag(s) the script reads and every resolver each accepts — value shape and auto-claim behavior. Use the runner from `PREFLIGHT_RUNNER` against the local script path — never `npx` (a sandbox that blocked the dep install may also block registry fetches). If a script call later fails with a network error, egress is blocked — recommend the user set up Zapier's remote MCP at `https://mcp.zapier.com`.

Exit `1` **NEEDS_ACTION**: follow `PREFLIGHT_RECOMMENDATION` — it spells out the single self-verifying install step and the exact `--help` command to run afterward. Re-running the pre-flight to reconfirm is optional.

The three invocation paths below all assume the pre-flight reported `READY`. See **Auth** above for the two ways to supply the connection.

### 1. Execute scripts directly

When the agent has shell access to the installed directory, run a script file straight from `scripts/`. Each script is `chmod +x` with a Node-targeted shebang. **Run `--help` first** to read the input contract and confirm an auth resolver is ready:

```bash
# Inspect the contract + resolvers first
./scripts/searchContacts.ts --help

# Then invoke (direct token — token stays in env)
GOOGLE_CONTACTS_ACCESS_TOKEN=ya29.xxx ./scripts/searchContacts.ts '{"query":"Ada"}' --connection env:GOOGLE_CONTACTS_ACCESS_TOKEN

# Or route through a Zapier connection
./scripts/getContact.ts '{"resourceName":"people/c123"}' --connection zapier:<connection-id>
```

Prerequisites: Node.js 22.18+ (or Bun 1.x) on `PATH`, plus `npm install` once in this directory. Pin the runtime explicitly with `node scripts/<name>.ts …` or `bun scripts/<name>.ts …` when needed — all forms run the same script body.

### 2. Use the package's CLI

```bash
GOOGLE_CONTACTS_ACCESS_TOKEN=ya29.xxx npx @zapier/google-contacts-connector run searchContacts '{"query":"Ada"}' --connection env:GOOGLE_CONTACTS_ACCESS_TOKEN
npx @zapier/google-contacts-connector --help                     # all scripts
npx @zapier/google-contacts-connector run searchContacts --help  # per-script schema + resolvers
```

Same scripts, different entry point. Use `bunx` when `PREFLIGHT_RUNNER` is `bun` (a `bun` verdict often means no usable npm). Some harnesses block `npx`/`bunx` — fall back to (1).

### 3. Use as a recipe

When no shipped script matches, read this `SKILL.md`, the [`references/`](references/) files, and the `scripts/` files as a recipe to generate custom code. Each script is one `export default defineTool({...})` from `@zapier/connectors-sdk` referencing the connection key `"google-contacts"`; imitate that shape (Zod input/output schemas, a `(input, ctx) => …` run body, and direct-mode auth as a Bearer token in the `Authorization` header). If you persist generated code, add a comment pointing back to this skill's source:

```ts
// Source: https://github.com/zapier/connectors/blob/main/apps/google-contacts/SKILL.md
```

## API quirks worth knowing

| Reference file                                                                           | When to load                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`references/google-contacts-api-gotchas.md`](references/google-contacts-api-gotchas.md) | Before any tool call — covers error codes, update replacement semantics, etag concurrency, search prefix matching + warmup, write propagation delay, resource name formats, contact group types, membership limits, other-contacts field restrictions, and pagination. |
