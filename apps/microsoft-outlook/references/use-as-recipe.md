# Calling Microsoft Graph directly (no tools, no terminal, no import)

This is the write-your-own-code shape: you can't load this connector's pre-registered
tools, can't run a terminal or subprocess, and can't `import` this package in-process —
you write and execute code yourself (for example, in a code-execution sandbox) that
calls the Microsoft Graph API directly. This reference teaches the request/response
shapes this connector's 30 scripts encode (mail, folders, categories, calendar,
contacts) so you can reproduce the same calls in your own code.

For everything about _how Microsoft Graph itself behaves_ — error recovery, id
stability, paging, `search` vs. `filter`, attachment limits, date-time/time-zone
handling, and more — this file only points into
[`microsoft-outlook-api-gotchas.md`](microsoft-outlook-api-gotchas.md); it doesn't
restate it. Read the linked section before you rely on a specific behavior.

## Auth & base URL

- Every call targets the Microsoft Graph **v1.0** REST API at
  `https://graph.microsoft.com/v1.0`.
- Every request carries a single OAuth 2.0 bearer token as an
  `Authorization: Bearer <token>` header — there's no separate bot/user credential
  split, just one token per request.
- Call `GET /me` first when you need the signed-in user's own identity (id,
  displayName, mail, userPrincipalName) — see the **Profile** shape below. It also
  doubles as an auth smoke test: a `200` means the token works.
- Acquiring/refreshing that token, the scopes each operation needs, and
  work-or-school vs. consumer-account differences are outside this file's scope —
  see [Authentication & identity](microsoft-outlook-api-gotchas.md#authentication--identity).

## Request/response shapes, by operation family

Each entry below is an HTTP method + path pattern and the field names this
connector's own request/response schemas use. Shapes here are **structural**
(field name + type only) — they ship as mechanism, not as vendor-behavior claims.
For what a field's real values, limits, or defaults actually are, follow the
linked gotchas section rather than assuming the shape below is exhaustive or
that any example value is the only one Graph accepts.

Two path placeholders recur:

- `{root}` — the mailbox root: your own mailbox by default, or (on operations that
  accept a `mailbox` address input) another mailbox's root instead. That only works
  under the conditions in
  [Shared mailboxes](microsoft-outlook-api-gotchas.md#shared-mailboxes).
- `{calendarRoot}` — `{root}` plus, when a `calendarId` input is supplied, that
  specific calendar's path; the default calendar otherwise.

### Profile

- `GET {root}/me` → no input. Response: `{ id: <string>, displayName?: <string>,
mail?: <string>, userPrincipalName: <string>, jobTitle?: <string>,
mobilePhone?: <string> }`.

### Composing & sending mail

A recipient is `{ emailAddress: { address: <string>, name?: <string> } }`.

- `POST {root}/sendMail` — body: `{ message: <OutgoingMessage>, saveToSentItems?:
<boolean> }`. Graph's response carries no body/id for this call; a caller-side
  wrapper can synthesize its own `{ success: true }` once the request doesn't
  error.
- `POST {root}/messages` — body: `<OutgoingMessage>`. Response: `{ id: <string>,
subject: <string>, isDraft: <boolean>, bodyPreview?: <string>, toRecipients?:
<Recipient[]>, webLink?: <string> }`. Creates a draft instead of sending.
- `POST {root}/messages/{messageId}/send` — no body. No response body from Graph;
  synthesize `{ success: true }` on a non-error result.
- `POST {root}/messages/{messageId}/reply` (or `/replyAll`) — body: `{ comment?:
<string> }`. No response body from Graph; synthesize `{ success: true }`.
- `POST {root}/messages/{messageId}/createReply` (or `/createReplyAll`) — body:
  `{ comment?: <string> }`. Response: `{ id: <string>, subject: <string>,
isDraft: <boolean>, webLink?: <string> }`.
- `POST {root}/messages/{messageId}/forward` — body: `{ toRecipients:
<Recipient[]> (at least one), comment?: <string> }`. No response body from
  Graph; synthesize `{ success: true }`.

An `OutgoingMessage` is a subject-and-recipients object (`subject`, `toRecipients`
at minimum); this connector's own schema covers more optional fields (body,
cc/bcc, importance, attachments) than are worth structurally enumerating here.

### Organizing mail

- `PATCH {root}/messages/{messageId}` — body carries only the fields you're
  changing: `isRead?: <boolean>`, `importance?: <enum string>`, `categories?:
<string[]>`, `flag?: { flagStatus: <enum string>, startDateTime?:
<DateTimeTimeZone>, dueDateTime?: <DateTimeTimeZone> }`. Response mirrors the
  updated message: `{ id, subject, isRead, importance?, categories?, flag? }`.
- `POST {root}/messages/{messageId}/move` — body: `{ destinationId: <string> }`.
  Response: `{ id: <string>, parentFolderId: <string>, subject: <string> }`.
- `POST {root}/messages/{messageId}/copy` — body: `{ destinationId: <string> }`.
  Response: `{ id: <string>, parentFolderId: <string>, subject: <string> }`.
- `DELETE {root}/messages/{messageId}` — no body. No response body from Graph;
  synthesize `{ success: true }`.

`DateTimeTimeZone` and the valid `importance`/`flagStatus` values are vendor
concepts, not connector inventions — see
[Calendar](microsoft-outlook-api-gotchas.md#calendar) for the `{ dateTime,
timeZone }` shape and [Messages](microsoft-outlook-api-gotchas.md#messages) /
[Item ids change when items move](microsoft-outlook-api-gotchas.md#item-ids-change-when-items-move--immutable-ids-are-requested-for-you)
for id and category-replace behavior before you build these bodies.

### Reading & searching mail

- `GET {root}/messages` or `GET {root}/mailFolders/{folderId}/messages` — query
  params built from a page-size (`limit`), a full-text `search` string, or an
  OData `filter` string; alternatively, a full follow-up-page URL (`cursor`)
  fetched verbatim in place of building a new query. Response: `{ items:
<MessageListItem[]>, next_cursor?: <string> }`.
- `GET {root}/messages/{messageId}` — with a `Prefer:
outlook.body-content-type="<text|html>"` header selecting the body's return
  format. Response: the full message object.
- `GET {root}/messages/{messageId}/attachments` — same `limit`/`cursor` paging
  pattern. Response: `{ items: <AttachmentListItem[]>, next_cursor?: <string> }`.
- `GET {root}/messages/{messageId}/attachments/{attachmentId}` — Response: the
  full attachment object, including `contentBytes` when present.

`search`, `filter`, and paging all have vendor-specific rules (mutually exclusive
in some combinations, opaque cursors, default/max page sizes) — read
[Paging](microsoft-outlook-api-gotchas.md#paging--next_cursor-is-an-opaque-url)
and
[Search vs. filter](microsoft-outlook-api-gotchas.md#search-vs-filter-listmessages-listcontacts-listevents)
before building these query strings. Attachment-specific behavior (inline
attachments, size limits, `contentBytes` availability) is in
[Attachments](microsoft-outlook-api-gotchas.md#attachments).

### Folders & categories

- `GET {root}/mailFolders` or `GET {root}/mailFolders/{parentFolderId}/childFolders`
  — paged the same way as messages. Response: `{ items: [{ id: <string>,
displayName: <string>, parentFolderId?: <string>, childFolderCount?: <number>,
unreadItemCount?: <number>, totalItemCount?: <number> }], next_cursor?:
<string> }`.
- `POST {root}/mailFolders` or `.../childFolders` — body: `{ displayName:
<string> }`. Response: `{ id: <string>, displayName: <string>,
parentFolderId?: <string> }`.
- `GET /me/outlook/masterCategories` — no paging params; the connector reads the
  entire collection from one response. Response: `{ items: [{ id?: <string>,
displayName: <string>, color?: <string> }] }`.

Folder id vs. well-known-name behavior is in
[Well-known folder names](microsoft-outlook-api-gotchas.md#well-known-folder-names);
category semantics (assignment by name, preset colors, master list) are in
[Categories](microsoft-outlook-api-gotchas.md#categories).

### Calendar

- `GET {root}/calendars` — paged. Response: `{ items: [{ id: <string>, name:
<string>, isDefaultCalendar?: <boolean>, canEdit?: <boolean> }], next_cursor?:
<string> }`.
- `GET {calendarRoot}/events` — an OData `filter` query param, otherwise paged
  the same way. Response: `{ items: <EventListItem[]>, next_cursor?: <string> }`.
- `GET {calendarRoot}/calendarView?startDateTime=<string>&endDateTime=<string>&
$top=<number>` — note `startDateTime`/`endDateTime` are literal (not
  `$`-prefixed) query params, unlike the page-size parameter. Response: `{
items: <EventListItem[]>, next_cursor?: <string> }`.
- `GET {calendarRoot}/events/{eventId}` — Response: the full event object.
- `POST {calendarRoot}/events` — body is an outgoing-event object; the fields
  you'll typically set are `subject: <string>`, `start`/`end`: `<DateTimeTimeZone>`,
  `location`, `body`, `attendees`, `categories`, `isAllDay: <boolean>`,
  `isOnlineMeeting: <boolean>`. Response: the full event object.
- `PATCH {calendarRoot}/events/{eventId}` — body is a _partial_ of the same
  outgoing-event object, carrying only the fields you're changing. Response: the
  full event object.
- `DELETE {calendarRoot}/events/{eventId}` — no body. No response body from
  Graph; synthesize `{ success: true }`.

Recurring-series semantics, all-day/online-meeting rules, attendee-replace
behavior, notification side effects, and the vendor's own enum values (`showAs`,
event `type`, `sensitivity`, attendee `type`/`status`) all live in
[Calendar](microsoft-outlook-api-gotchas.md#calendar) — read it before writing
`start`/`end`/`attendees` yourself.

### Contacts

- `GET /me/contacts` — an OData `filter` query param, otherwise paged. Response:
  `{ items: <Contact[]>, next_cursor?: <string> }`.
- `GET /me/contacts/{contactId}` — Response: the full contact object.
- `POST /me/contacts` — body is an outgoing-contact object; fields you'll
  typically set are name fields (`givenName`, `surname`, `displayName`),
  `emailAddresses`, and `businessPhones`. Response: the full contact object.
- `PATCH /me/contacts/{contactId}` — body is a partial of the same
  outgoing-contact object, carrying only the fields you're changing. Response:
  the full contact object.
- `DELETE /me/contacts/{contactId}` — no body. No response body from Graph;
  synthesize `{ success: true }`.

The email-address cap, array-replace-on-PATCH behavior, and `displayName`
auto-regeneration are in
[Contacts](microsoft-outlook-api-gotchas.md#contacts) — read it before you build
an update body.

## Error-handling pattern

Every operation above funnels through the same two-step pattern: issue the HTTP
request and raise/branch on any non-2xx response, then — for calls that do
return a body — parse it as JSON. Calls whose Graph response has no body (the
`sendMail`, `sendDraft`, `reply`/`replyAll`, `forward`, `move`/`copy`-adjacent
delete, and `DELETE` operations listed above) don't have JSON to parse on
success; write your own code to treat "request didn't raise" as success there,
the way this connector's scripts synthesize their own `{ success: true }`.

The actual shape of an error response — a single JSON `error` object with a
machine-readable `code` and a `message`, the status codes you'll see, and how to
recover from each — is a vendor fact, not a connector invention. Don't
reconstruct it from guesswork: see
[Errors, recovery & throttling](microsoft-outlook-api-gotchas.md#errors-recovery--throttling),
including the `429`/`Retry-After` backoff rule.

## Critical rules

These are vendor-behavior facts your own code needs to get right; each is
sourced and explained in the gotchas doc, not repeated here:

- **Ids change on move; this connector requests immutable ones.** Before you
  build any code path that stores or re-uses a message/event/contact id, read
  [Item ids change when items move](microsoft-outlook-api-gotchas.md#item-ids-change-when-items-move--immutable-ids-are-requested-for-you).
- **Shared-mailbox access has delegation prerequisites and a `search` restriction.**
  See [Shared mailboxes](microsoft-outlook-api-gotchas.md#shared-mailboxes)
  before you point `{root}` at another user's mailbox.
- **Paging cursors are opaque URLs — don't parse or rebuild them.** See
  [Paging](microsoft-outlook-api-gotchas.md#paging--next_cursor-is-an-opaque-url).
- **`search` and `filter` are different query mechanisms with different rules,
  and can't always be combined.** See
  [Search vs. filter](microsoft-outlook-api-gotchas.md#search-vs-filter-listmessages-listcontacts-listevents).
- **Mail-specific behavior** (async-accepted sends, default Sent-Items saving,
  soft-delete semantics, `bodyPreview` truncation, body-format negotiation) is in
  [Messages](microsoft-outlook-api-gotchas.md#messages), including
  [well-known folder names](microsoft-outlook-api-gotchas.md#well-known-folder-names).
- **Attachment kind and size limits** are in
  [Attachments](microsoft-outlook-api-gotchas.md#attachments).
- **Recurrence, all-day events, online meetings, attendee-replace, and
  cancellation notifications** are in
  [Calendar](microsoft-outlook-api-gotchas.md#calendar).
- **Contact field limits and update semantics** are in
  [Contacts](microsoft-outlook-api-gotchas.md#contacts).
- **Category assignment and coloring** are in
  [Categories](microsoft-outlook-api-gotchas.md#categories).
- **Error envelope, status codes, and throttling backoff** are in
  [Errors, recovery & throttling](microsoft-outlook-api-gotchas.md#errors-recovery--throttling).

No vendor-behavior assertion in this file goes beyond what's already sourced in
the gotchas doc above — this run didn't need to add a new claim.

## Where to go next

- [`microsoft-outlook-api-gotchas.md`](microsoft-outlook-api-gotchas.md) — the
  full set of vendor-behavior rules pointed to above:
  [Authentication & identity](microsoft-outlook-api-gotchas.md#authentication--identity),
  [Item ids change when items move](microsoft-outlook-api-gotchas.md#item-ids-change-when-items-move--immutable-ids-are-requested-for-you),
  [Shared mailboxes](microsoft-outlook-api-gotchas.md#shared-mailboxes),
  [Paging](microsoft-outlook-api-gotchas.md#paging--next_cursor-is-an-opaque-url),
  [Search vs. filter](microsoft-outlook-api-gotchas.md#search-vs-filter-listmessages-listcontacts-listevents),
  [Messages](microsoft-outlook-api-gotchas.md#messages) (including
  [well-known folder names](microsoft-outlook-api-gotchas.md#well-known-folder-names)),
  [Attachments](microsoft-outlook-api-gotchas.md#attachments),
  [Calendar](microsoft-outlook-api-gotchas.md#calendar),
  [Contacts](microsoft-outlook-api-gotchas.md#contacts),
  [Categories](microsoft-outlook-api-gotchas.md#categories),
  [Errors, recovery & throttling](microsoft-outlook-api-gotchas.md#errors-recovery--throttling).
- [`../SKILL.md`](../SKILL.md) — the full 30-script catalog, the disambiguation
  and refusal rules, and what this connector deliberately doesn't support
  (triggers, large attachments, group calendars, permanent delete).
