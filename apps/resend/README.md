# @zapier/resend-connector

<!-- BEGIN:readme-intro -->

Agent-callable tools for [Resend](https://resend.com/docs/api-reference/introduction), the email API. Send transactional email, manage a contact list and its segments, send broadcasts to a whole segment, read the delivery status of sent email, discover custom contact properties, and check which sending domains are verified — 21 scripts covering Resend's email, contacts, segments, broadcasts, domains, and automation-event surfaces. Authenticates with a single Resend API key (a bearer token).

<!-- legal:disclaimer -->

_Independent, unofficial connector for Resend. Not affiliated with, endorsed by, or sponsored by Resend. "Resend" is a trademark of its owner, used only to identify the service this connector works with._
<!-- /legal:disclaimer -->
<!-- END:readme-intro -->

## When to use this

<!-- BEGIN:readme-when-to-use -->

- Sending transactional email to specific recipients, or a marketing broadcast to an entire segment, from an agent or automation.
- Managing a Resend contact list programmatically — creating, updating, segmenting, and looking up contacts (by id or email).
- Checking whether a message delivered, or diagnosing why a send failed (e.g. an unverified sending domain).

<!-- END:readme-when-to-use -->

## When NOT to use this

<!-- BEGIN:readme-when-not-to-use -->

- **Provisioning or verifying sending domains** — domain setup is DNS work done once in the Resend dashboard; `listDomains` here is read-only (status diagnosis only).
- **Authoring automation flows** — this connector can _trigger_ a configured automation (`sendEvent`) but not create or edit the automation graph; use the Resend dashboard.
- **Managing API keys, webhooks, email templates, or suppression lists**, or sending batch / raw-bytes-attachment email — those surfaces are out of scope.

<!-- END:readme-when-not-to-use -->

## Install

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

```bash
# Run a script with zero install — npx fetches the package on first use
export <ENV_VAR>=xxx
npx @zapier/resend-connector@latest run <script> '<input-json>' --connection env:<ENV_VAR>

# Install as a dependency to import the functions in your own code
npm install @zapier/resend-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills add zapier/connectors --skill resend
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection` — a _selector_, not the secret. The `<resolver>:` prefix is optional; a bare value is claimed by the first matching resolver. See [Auth](#auth) below for the with/without-Zapier tradeoffs and how to find a connection ID.

### MCP server

Run the connector as an MCP server over stdio so any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) auto-discovers the scripts as tools — add one stanza to the client's config:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "resend": {
      "command": "npx",
      "args": ["@zapier/resend-connector", "mcp"]
    }
  }
}
```

`--connection` is optional — omit it to pass a connection per tool call, or add `"--connection", "zapier:<connection-id>"` (or `"env:<ENV_VAR>"` with `"env": { "<ENV_VAR>": "xxx" }`) to `args` to set a default.

## Scripts

<!-- BEGIN:readme-scripts-table -->

| Script                     | Description                                                   |
| -------------------------- | ------------------------------------------------------------- |
| `sendEmail`                | Send a transactional email to one or more recipients.         |
| `getEmail`                 | Retrieve a sent email and its current delivery status.        |
| `listEmails`               | List previously sent emails, most recent first.               |
| `createContact`            | Create a contact in the account's contact list.               |
| `getContact`               | Retrieve a single contact by id or email.                     |
| `updateContact`            | Update a contact's name, subscription status, or properties.  |
| `deleteContact`            | Delete a contact by id or email.                              |
| `listContacts`             | List all contacts in the account.                             |
| `listContactSegments`      | List the segments a contact belongs to.                       |
| `listSegmentContacts`      | List a segment's members.                                     |
| `createSegment`            | Create a named segment.                                       |
| `listSegments`             | List the account's segments.                                  |
| `getSegment`               | Get a single segment by id.                                   |
| `deleteSegment`            | Delete a segment (contacts in it are not deleted).            |
| `addContactToSegment`      | Add a contact to a segment.                                   |
| `removeContactFromSegment` | Remove a contact from a segment (the contact is not deleted). |
| `listContactProperties`    | List the account's custom contact-property keys.              |
| `createBroadcast`          | Draft a broadcast — one email to every contact in a segment.  |
| `sendBroadcast`            | Send or schedule a previously-created broadcast.              |
| `listDomains`              | List sending domains and their verification status.           |
| `sendEvent`                | Trigger a configured automation by sending a named event.     |

<!-- END:readme-scripts-table -->

Run `npx @zapier/resend-connector@latest run <script> --help` to see any script's exact input contract + the available resolvers.

## Usage

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function. Pass auth as one `[<resolver>:]<value>` string, e.g. `{ connection: "env:<ENV_VAR>" }`.

<!-- BEGIN:readme-usage-example -->

```ts
import { sendEmail } from "@zapier/resend-connector";

const { data } = await sendEmail(
  {
    from: "you@your-domain.com",
    to: ["dest@example.com"],
    subject: "Hi",
    text: "Hello",
  },
  { connection: "env:RESEND_API_KEY" },
);
// data.id — the sent email's id; pass to getEmail to read delivery status.
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
- [Source](https://github.com/zapier/connectors/tree/main/apps/resend)

<!-- BEGIN:readme-links-extra -->

- [Resend API reference](https://resend.com/docs/api-reference/introduction) — the upstream API this connector wraps

<!-- END:readme-links-extra -->

<!-- BEGIN:readme-footer? -->
<!-- legal:footer -->

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Resend's API, services, data, schemas, documentation, or other materials, which remain the property of Resend. Your use of Resend's API is governed by your own agreement with Resend.

**Trademarks and affiliation.** Resend and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Resend.

**Your responsibility.** This connector calls Resend's API using credentials you supply. You are responsible for holding a valid Resend account, for complying with Resend's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Resend product. Zapier is not responsible for changes Resend makes to its API or for any consequence of your use of Resend's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
<!-- /legal:footer -->
<!-- END:readme-footer -->
