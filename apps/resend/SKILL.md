---
name: resend
description: Agent-callable Resend tools — send transactional email, manage contacts and segments, send broadcasts, read delivery status, and diagnose sending domains. Use when the user mentions Resend or wants to send email, manage a contact list, or check email delivery, even if they don't name Resend explicitly.
license: Elastic-2.0
compatibility: Run `npm install --omit=dev` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for build-it-yourself / prebuilt / alternative-runtime options.
metadata:
  source: https://github.com/zapier/connectors/blob/main/apps/resend/SKILL.md
  title: Resend
  api-docs: https://resend.com/docs/api-reference/introduction
  zapier-app-key: App178572CLIAPI
---

# Resend

_Independent, unofficial connector for Resend. Not affiliated with, endorsed by, or sponsored by Resend. "Resend" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable tools for Resend, the email API. Send transactional email to one or more recipients, manage a contact list (create, look up, update, delete contacts and their custom properties), organize contacts into segments and manage segment membership, send a broadcast to an entire segment, read the delivery status of sent email, and check which sending domains are verified. Wraps the public [Resend API](https://resend.com/docs/api-reference/introduction) over a single API-key credential.

## When to use this

- **Send email** — a transactional message to specific recipients (`sendEmail`), or a marketing broadcast to a whole segment (`createBroadcast` + `sendBroadcast`).
- **Manage contacts** — create, retrieve, update, list, and delete contacts, and read a contact's segments; contacts are addressable by id **or** email address.
- **Manage segments** — create, list, get, and delete segments (named groupings a contact can belong to), and add or remove contacts.
- **Check delivery and diagnose sends** — read a sent email's status (`getEmail`, `listEmails`), discover custom contact-property keys (`listContactProperties`), verify sending domains (`listDomains`), and trigger a configured automation (`sendEvent`).

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

If the connector has not been installed as a skill yet, install it first with `npx skills add zapier/connectors --skill resend` (or your harness's own skill-install mechanism), then continue here. Installing the skill copies these files, not dependencies. Before running the CLI, a local MCP server, or `zapier-sdk` auth commands, run `npm install --omit=dev` here once. Importing the published package as a dependency in your own project instead? That `npm install` already resolves everything — see [`references/use-as-sdk.md`](references/use-as-sdk.md).

The connector runs on **Node.js 22.18+**. Pick the reference that matches how you're running it, and load it before doing anything else:

| You have...                                                                                                                                                 | Load                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| An MCP-aware client — tools may already be loaded (e.g. `mcp__resend__<tool>`), or you can register a local server yourself (or guide the user to)          | [`references/use-as-mcp.md`](references/use-as-mcp.md)       |
| Terminal / subprocess access (you can run `node`)                                                                                                           | [`references/use-as-cli.md`](references/use-as-cli.md)       |
| Only your own code, importing this package as a dependency                                                                                                  | [`references/use-as-sdk.md`](references/use-as-sdk.md)       |
| No tool access, no terminal, no ability to import this package — you write your own code that calls the Resend API directly (e.g. a code-execution sandbox) | [`references/use-as-recipe.md`](references/use-as-recipe.md) |

## Scripts

Every script uses the single `resend` connection. Contact-referencing tools accept a contact **id or email address** interchangeably.

| Script                                | Script name                | Connections | Description                                                                                            |
| ------------------------------------- | -------------------------- | ----------- | ------------------------------------------------------------------------------------------------------ |
| `scripts/sendEmail.ts`                | `sendEmail`                | `resend`    | Send a transactional email to one or more recipients.                                                  |
| `scripts/getEmail.ts`                 | `getEmail`                 | `resend`    | Retrieve a sent email and its current delivery status.                                                 |
| `scripts/listEmails.ts`               | `listEmails`               | `resend`    | List previously sent emails, most recent first.                                                        |
| `scripts/createContact.ts`            | `createContact`            | `resend`    | Create a contact in the account's contact list.                                                        |
| `scripts/getContact.ts`               | `getContact`               | `resend`    | Retrieve a single contact by id or email.                                                              |
| `scripts/updateContact.ts`            | `updateContact`            | `resend`    | Update a contact's name, subscription status, or properties.                                           |
| `scripts/deleteContact.ts`            | `deleteContact`            | `resend`    | Delete a contact by id or email.                                                                       |
| `scripts/listContacts.ts`             | `listContacts`             | `resend`    | List all contacts in the account.                                                                      |
| `scripts/listContactSegments.ts`      | `listContactSegments`      | `resend`    | List the segments a contact belongs to.                                                                |
| `scripts/listSegmentContacts.ts`      | `listSegmentContacts`      | `resend`    | List a segment's members. `listContacts` does not filter by segment — use this instead.                |
| `scripts/createSegment.ts`            | `createSegment`            | `resend`    | Create a named segment.                                                                                |
| `scripts/listSegments.ts`             | `listSegments`             | `resend`    | List the account's segments.                                                                           |
| `scripts/getSegment.ts`               | `getSegment`               | `resend`    | Get a single segment by id.                                                                            |
| `scripts/deleteSegment.ts`            | `deleteSegment`            | `resend`    | Delete a segment (removes the segment, not its contacts — use `deleteContact` for that).               |
| `scripts/addContactToSegment.ts`      | `addContactToSegment`      | `resend`    | Add a contact to a segment.                                                                            |
| `scripts/removeContactFromSegment.ts` | `removeContactFromSegment` | `resend`    | Remove a contact from a segment (changes membership only — use `deleteContact` to remove the contact). |
| `scripts/listContactProperties.ts`    | `listContactProperties`    | `resend`    | List the account's custom contact-property keys.                                                       |
| `scripts/createBroadcast.ts`          | `createBroadcast`          | `resend`    | Draft a broadcast — one email to every contact in a segment.                                           |
| `scripts/sendBroadcast.ts`            | `sendBroadcast`            | `resend`    | Send or schedule a previously-created broadcast.                                                       |
| `scripts/listDomains.ts`              | `listDomains`              | `resend`    | List sending domains and their verification status.                                                    |
| `scripts/sendEvent.ts`                | `sendEvent`                | `resend`    | Trigger a configured automation by sending a named event.                                              |

## Disambiguation & refusals

**Before writing to a segment or contact looked up by name, resolve the id first and count matches.** Segment names and contact names are not unique. When an instruction names a segment (e.g. "add Sarah to the VIP segment") or a person, resolve it via `listSegments` / `listContacts` (or `getContact` by email) and count _exact_ (case-insensitive) matches:

- **Exactly one match** → act on it. Don't over-ask for confirmation on an unambiguous single match.
- **Two or more that tie on the name** → stop, list the candidates with a distinguishing field (segment `created_at`; contact `email`), and ask which one. Never silently pick the first.

**This check still applies even if you already hold a candidate id** — e.g. if you just created two segments with the same name earlier in this session. Already knowing one id is not the same as confirming it's the only match: run `listSegments` / `listContacts` and count matches before writing, the same as if you'd looked the name up fresh. Don't reuse an id from your own recent tool output as a shortcut past the count-and-ask step.

Prefer addressing contacts by **email address** when you have it — `getContact`, `updateContact`, `deleteContact`, `addContactToSegment`, `removeContactFromSegment`, and `listContactSegments` all accept an email directly, which sidesteps name collisions entirely.

**A successful `updateContact` custom-property write is not proof the value persisted.** Discover valid keys via `listContactProperties` before writing one you haven't already confirmed. If you write a property under a key you haven't verified, read the contact back (`getContact`) before reporting it as set — don't rely on the write call's bare success status alone.

**Unsupported operations — say so and stop; don't substitute another tool.** This connector does **not**:

- **Verify or provision a sending domain** — `listDomains` is read-only (it reports verification _status_ so you can diagnose a failed send). Adding, verifying, or deleting a domain is DNS work done once in the Resend dashboard; there is no tool for it here. If a send fails because a domain isn't verified, report which domain is unverified and point the user to the dashboard — don't claim to have fixed it.
- **Author automations** — `sendEvent` triggers an automation a human already configured in the dashboard; it does not create or edit the automation graph. If asked to build an automation flow, say it's unsupported.
- **Manage API keys, webhooks, templates, or suppressions**, or send batch/base64-attachment email. Attachments are supported only by hosted URL (`path`), not raw bytes.

## Auth

Every shape passes auth as one connection **selector**, not the secret — a `[<resolver>:]<value>` string. Every connector accepts `zapier:<connection-id>` (Zapier-managed auth — routes through Zapier's auth, retries, and governance layer); some also accept one or more direct-token resolvers (naming and count vary per connector) — check this connector's own resolvers rather than assuming. The `<resolver>:` prefix is optional; a bare value goes to the first resolver that claims it — a UUID-shaped bare value always claims `zapier:`. Each script declares the connections it needs and the resolvers each accepts. The exact syntax for passing a connection (and how to see this connector's resolver list) differs by shape — see the reference you loaded above.

Checking what's already configured first? Don't dump environment values to do it — `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if one is set. Check names only (`env | cut -d= -f1 | grep -i <name>`) or test a known name directly (`[ -n "$VAR_NAME" ]`).

No connection yet? Pick one — and follow the reference's own flow to obtain it; never just ask the user for a connection id or token as if they already have one memorized:

|                                      | Load                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Pass the credential directly         | [`references/use-without-zapier.md`](references/use-without-zapier.md) |
| Route it through a Zapier connection | [`references/use-with-zapier.md`](references/use-with-zapier.md)       |

## Output format

Every script returns a `{ data, meta }` envelope:

- **`data`** — the script's result (the shape its `outputSchema` declares; see the reference you loaded above for how to inspect a script's exact schema in your shape).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths were stripped from `data`: fields the script returned from the API that the `outputSchema` doesn't declare. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked script output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, opt out of output validation (the exact syntax differs by shape — see the reference you loaded above). Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, pass a jq expression that post-processes `data` (again, exact syntax per shape). The jq runs against `data` only, NOT the `{ data, meta }` envelope, so write it rooted at `data` (run the script's `--help` — or your shape's equivalent — to see its output schema). The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated against the output schema.

## References

Load the matching reference file before working in that area:

| Reference                                                              | Load when                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`references/resend-api-gotchas.md`](references/resend-api-gotchas.md) | Before or after any Resend call — API key permissions, verified-sender/403 rules, rate limits and quotas, the error-code table, `sendEmail` limits (recipients, tags, attachments), `last_event` and domain-status enums, pagination defaults, and broadcast/segment/automation behavior. |
