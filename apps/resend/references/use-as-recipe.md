# Using Resend without tools, terminal, or imports

This is the write-your-own-code path: no pre-registered tools, no terminal/subprocess access, and no way to `import` this package in-process (for example, a code-execution sandbox that only runs snippets you author). If any of those are actually available instead, use [`references/use-as-mcp.md`](use-as-mcp.md), [`references/use-as-cli.md`](use-as-cli.md), or [`references/use-as-sdk.md`](use-as-sdk.md) — this file is only for when none of them are.

All calls go to the base URL `https://api.resend.com` with your own authed request carrying `Authorization: Bearer re_…` and, for JSON bodies, `Content-Type: application/json`. Every non-2xx response is a JSON error envelope — handle it once (see [Error handling](#error-handling)).

## Request patterns

Method + path + the request body/query each tool builds. Bodies are JSON; path ids are URL-encoded.

### Email

- **Send** — `POST /emails`
  Body: `{ from, to: string[], subject, html?, text?, cc?: string[], bcc?: string[], reply_to?: string[], headers?: Record<string,string>, scheduled_at?, tags?: { name?, value? }[], attachments?: { path, filename, content_type?, content_id? }[] }`
  → `{ id }`
- **Get** — `GET /emails/{email_id}`
  → `{ object: "email", id, to: string[], from, subject, created_at, last_event, html?, text?, cc?, bcc?, reply_to?, scheduled_at? }`
- **List** — `GET /emails?limit&after&before`
  → `{ object: "list", has_more, data: { id, to?, from?, subject?, created_at?, last_event? }[] }`

### Contacts

- **Create** — `POST /contacts`
  Body: `{ email, first_name?, last_name?, unsubscribed?, properties?: Record<string,unknown>, segments?: { id }[] }` → `{ object: "contact", id }`
- **Get** — `GET /contacts/{id-or-email}` → `{ object: "contact", id, email, first_name?, last_name?, created_at?, unsubscribed?, properties? }`
- **Update** — `PATCH /contacts/{id-or-email}` with `{ first_name?, last_name?, unsubscribed?, properties? }` → `{ object: "contact", id }`
- **Delete** — `DELETE /contacts/{id-or-email}` → `{ object: "contact", contact?, deleted }`
- **List** — `GET /contacts?limit&after&before` → `{ object: "list", has_more, data: { id, email, first_name?, last_name?, created_at?, unsubscribed? }[] }`
  `GET /contacts` does not filter by segment — an unrecognized `segment_id` query param is silently ignored and returns the full account contact list with `200 OK`. Use **List a segment's contacts** below to resolve segment membership.
- **List custom properties** — `GET /contact-properties?limit&after&before` → `{ object: "list", has_more, data: { id, key, type?, fallback_value?, created_at? }[] }`
- **List a contact's segments** — `GET /contacts/{id-or-email}/segments` → `{ object: "list", has_more?, data: { id, name, created_at? }[] }`
- **List a segment's contacts** — `GET /segments/{segment_id}/contacts?limit&after&before` → `{ object: "list", has_more, data: { id, email, first_name?, last_name?, created_at?, unsubscribed? }[] }`

### Segments

- **Create** — `POST /segments` with `{ name }` → `{ object: "segment", id, name }`
- **Get** — `GET /segments/{id}` → `{ id, name, created_at? }`
- **Delete** — `DELETE /segments/{id}` → `{ object: "segment", id, deleted }`
- **List** — `GET /segments?limit&after&before` → `{ object: "list", has_more, data: { id, name, created_at? }[] }`
- **Add contact** — `POST /contacts/{contact_id}/segments/{segment_id}` → `{ id }`
- **Remove contact** — `DELETE /contacts/{contact_id}/segments/{segment_id}` → `{ id, deleted? }`

### Broadcasts

- **Create (draft)** — `POST /broadcasts` with `{ segment_id, from, subject, reply_to?, html?, text?, name? }` → `{ id }`
- **Send / schedule** — `POST /broadcasts/{broadcast_id}/send` with `{ scheduled_at? }` → `{ id }`

### Domains & automations

- **List domains** — `GET /domains` → `{ object: "list", has_more?, data: { id, name, status, created_at?, region? }[] }`
- **Trigger an automation** — `POST /events/send` with `{ event, contact_id? | email?, payload? }` → `{ object: "event", event }`

## Error handling

Non-2xx responses share one shape:

```json
{ "name": "…", "message": "…", "statusCode": 000 }
```

Branch on `name`. For which codes mean what and how to recover (restricted key, unverified sender domain, rate limit, quotas, not-found), see the error table in [`references/resend-api-gotchas.md`](resend-api-gotchas.md#error-envelope) — don't hard-code recovery from the message string.

## Critical rules

Get these right up front; each is detailed in the gotchas reference:

- **Sender domain must be verified**; the sandbox sender only mails your own address. → [resend-api-gotchas.md](resend-api-gotchas.md#sender-domain-must-be-verified)
- **A sending-only API key** can't touch contacts/segments/domains/broadcasts. → [resend-api-gotchas.md](resend-api-gotchas.md#api-key-permissions--sending-vs-full-access)
- **Pagination** is cursor-based; `after`/`before` are mutually exclusive; page while `has_more` is true. → [resend-api-gotchas.md](resend-api-gotchas.md#pagination-all-list-tools)
- **`sendEmail` caps `to` at 50** and tag name/value charset+length is constrained. → [resend-api-gotchas.md](resend-api-gotchas.md#sending-email-sendemail)
- **`createBroadcast` only drafts** — nothing sends until `POST /broadcasts/{id}/send`. → [resend-api-gotchas.md](resend-api-gotchas.md#broadcasts)
- **`sendEvent`** identifies the contact by `contact_id` or `email`, and the event name must match an automation trigger. → [resend-api-gotchas.md](resend-api-gotchas.md#triggering-automations-sendevent)
