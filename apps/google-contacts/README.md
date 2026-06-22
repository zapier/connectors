# @zapier/google-contacts-connector

_Independent, unofficial connector for Google Contacts. Not affiliated with, endorsed by, or sponsored by Google Contacts. "Google Contacts" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable tools for Google Contacts, wrapping the [Google People API](https://developers.google.com/people/api/rest). It lets an agent create, read, update, and delete a person's contacts; search contacts by name, email, or phone; set or remove contact photos; create and manage contact groups (labels) and their membership; and browse the auto-saved "other contacts" surface. Authentication is OAuth 2.0 — either a Zapier-managed connection (recommended) or a direct Google access token.

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

## Install

```bash
# Run a tool with zero install — npx fetches the package on first use
GOOGLE_CONTACTS_ACCESS_TOKEN=xxx npx @zapier/google-contacts-connector run <toolName> '{ ... }' --connection env:GOOGLE_CONTACTS_ACCESS_TOKEN

# Install as a dependency to import the tools in your own code
npm install @zapier/google-contacts-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills zapier/connectors --skill google-contacts
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection`. The value is a _selector_, not the secret: `--connection zapier:<connection-id>` routes through Zapier-managed auth (recommended; no third-party secret enters the agent's environment — store the id in `GOOGLE_CONTACTS_ZAPIER_CONNECTION_ID` and pass `--connection "zapier:$GOOGLE_CONTACTS_ZAPIER_CONNECTION_ID"` if you like), and `--connection env:GOOGLE_CONTACTS_ACCESS_TOKEN` reads a direct token from `$GOOGLE_CONTACTS_ACCESS_TOKEN` (the token stays in `env`, never on argv). The `<resolver>:` prefix is optional — a bare value is claimed by the first matching resolver. See [`SKILL.md`](SKILL.md#auth) for tradeoffs and how to find a connection ID.

## Tools

| Tool                        | Description                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `createContact`             | Create a contact from structured name, email, phone, address, and organization fields.     |
| `getContact`                | Retrieve a single contact by resource name, with full field detail.                        |
| `updateContact`             | Update a contact; each array sent replaces that whole field, omitted fields are untouched. |
| `deleteContact`             | Delete a contact from the account.                                                         |
| `listContacts`              | List the account's contacts, paginated — the primary resourceName resolver.                |
| `searchContacts`            | Search contacts by name, nickname, email, phone, or organization (prefix match).           |
| `updateContactPhoto`        | Set or replace a contact's photo from a base64-encoded image.                              |
| `deleteContactPhoto`        | Remove a contact's photo, reverting to the default avatar.                                 |
| `listContactGroups`         | List contact groups (labels), user and system — the contactGroupResourceName resolver.     |
| `getContactGroup`           | Get a single contact group, optionally with its member contact resource names.             |
| `createContactGroup`        | Create a new user contact group (label).                                                   |
| `updateContactGroup`        | Rename a user contact group (system groups cannot be renamed).                             |
| `deleteContactGroup`        | Delete a user contact group (label), optionally with its member contacts.                  |
| `modifyContactGroupMembers` | Add and/or remove contacts in a group without disturbing other memberships.                |
| `listOtherContacts`         | List auto-saved "other contacts" (people interacted with but never saved).                 |
| `searchOtherContacts`       | Search "other contacts" by name, email, or phone (prefix match).                           |
| `copyOtherContact`          | Promote an "other contact" into saved contacts, returning an editable contact.             |

Run `npx @zapier/google-contacts-connector run <toolName> --help` to see any tool's exact input contract + the available resolvers.

## Usage

```ts
import { searchContacts } from "@zapier/google-contacts-connector";

// Each named export is the consumer-facing (input, opts) => Promise<{ data, meta }>.
const { data } = await searchContacts(
  { query: "jane" },
  { connection: "env:GOOGLE_CONTACTS_ACCESS_TOKEN" },
);
// data.results[].person is the canonical People API Person resource.
```

## MCP Server

Add one stanza to any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) to auto-discover the tools over stdio:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "google-contacts": {
      "command": "npx",
      "args": ["@zapier/google-contacts-connector", "mcp", "--connection", "zapier:<connection-id>"],
    }
  }
}
```

No Zapier account? Use the `env:` resolver — point `--connection` at an env-var name and keep the token in `env`: `"args": ["@zapier/google-contacts-connector", "mcp", "--connection", "env:GOOGLE_CONTACTS_ACCESS_TOKEN"]` with `"env": { "GOOGLE_CONTACTS_ACCESS_TOKEN": "xxx" }`.

## When to use this

Use this connector to manage a person's own Google Contacts — saving and finding people, editing their details, organizing them into groups/labels, and turning auto-saved "other contacts" into real contacts. It's the right pick for contact-CRUD, contact search, and label management against a single Google account over the People API.

## When NOT to use this

- **Google Workspace directory lookups** (org-wide people search) — not covered; this connector manages the user's personal contacts, not the domain directory.
- **Bulk/batch contact imports or mass edits** — there are no batch tools; act on one contact at a time.
- **Contact merge/dedupe** — not supported by these tools.

## Links

- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Google People API reference](https://developers.google.com/people/api/rest) — the upstream API this connector wraps
- [Source](https://github.com/zapier/connectors/tree/main/apps/google-contacts)

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Google Contacts's API, services, data, schemas, documentation, or other materials, which remain the property of Google Contacts. Your use of Google Contacts's API is governed by your own agreement with Google Contacts.

**Trademarks and affiliation.** Google Contacts and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Google Contacts.

**Your responsibility.** This connector calls Google Contacts's API using credentials you supply. You are responsible for holding a valid Google Contacts account, for complying with Google Contacts's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Google Contacts product. Zapier is not responsible for changes Google Contacts makes to its API or for any consequence of your use of Google Contacts's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
