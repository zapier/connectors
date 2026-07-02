# Microsoft Outlook (Microsoft Graph) — API gotchas

Behavioral notes for the Outlook tools, which call the **Microsoft Graph v1.0** REST API
(`https://graph.microsoft.com/v1.0`). Every claim here is sourced from the public Microsoft
Graph documentation; links are inline. Load this when a call returns an error you don't
understand, when ids stop resolving, or when paging / search / date-time handling behaves
unexpectedly.

## Authentication & identity

- Every request is authorized with a single OAuth 2.0 **bearer token** (`Authorization: Bearer
<token>`); there is no bot/user split. Use **getMe** as the auth probe — a `200` confirms the
  connection works and returns your `id`, `displayName`, `mail`, and `userPrincipalName`.
- Resolve **"my email"** with getMe before composing or filtering, since the signed-in user's
  address isn't otherwise known to the tools.

## Item ids change when items move — immutable ids are requested for you

By default a message/event/contact **id changes when the item is moved** from one container to
another: _"By default, this value changes when the item is moved from one container (such as a
folder or calendar) to another."_ ([message resource](https://learn.microsoft.com/en-us/graph/api/resources/message),
[event resource](https://learn.microsoft.com/en-us/graph/api/resources/event)) This is the dominant
cause of stale-id `404`s.

This connector sends `Prefer: IdType="ImmutableId"` on **every** request, so the ids you get back
are stable: _"Immutable identifiers (IDs) enable your application to obtain an ID that doesn't
change for the lifetime of the item"_ and _"will NOT change if the item is moved to a different
folder in the mailbox."_ ([immutable ids](https://learn.microsoft.com/en-us/graph/outlook-immutable-id))
The immutable id still changes if the item is moved to an **archive mailbox** or exported and
re-imported (same source).

On **consumer Outlook.com accounts** (personal Microsoft accounts), Graph may ignore the
`Prefer: IdType="ImmutableId"` header and return mutable ids — only M365 and Exchange Online
work or school mailboxes are guaranteed to honor it.
([immutable ids](https://learn.microsoft.com/en-us/graph/outlook-immutable-id))

- **moveMessage** returns the message in its new folder; use the id from that response for any
  follow-up call. ([move message](https://learn.microsoft.com/en-us/graph/api/resources/message) — _"Move
  the message to a folder. This creates a new copy of the message in the destination folder."_)
- Ids are **case-sensitive**: _"all identifiers in Microsoft Graph, are case-sensitive."_
  ([immutable ids](https://learn.microsoft.com/en-us/graph/outlook-immutable-id))
- A sent message can be located in **Sent Items** by creating the draft with the immutable-id
  header and reusing that id after sending. ([immutable ids](https://learn.microsoft.com/en-us/graph/outlook-immutable-id))

## Shared mailboxes

Pass a `mailbox` (UPN/email) to act on another user's mailbox via `/users/{id|userPrincipalName}`.
This only works when that user has **shared the folder or delegated access** to the signed-in
user: _"If Garth hasn't shared his Inbox with John, nor has he delegated his mailbox to John,
specifying Garth's user ID or user principal name in those GET operations return an error."_
([shared/delegated folders](https://learn.microsoft.com/en-us/graph/outlook-share-messages-folders)).
Reading/writing a shared folder uses the `Mail.Read.Shared` / `Mail.ReadWrite.Shared` delegated
permissions (same source). Sending **from** a shared mailbox relies on Exchange-side delegation —
the message `sender`/`from` _"can be set to a different value when sending a message from a shared
mailbox … or as a delegate."_ ([message resource](https://learn.microsoft.com/en-us/graph/api/resources/message))

**`search` is not supported on shared or delegated mailboxes.** The KQL `$search` parameter only
works against the signed-in user's own mailbox. Passing both `search` and `mailbox` results in a
connector error before the request is sent. Use `filter` instead when querying a shared mailbox.
([shared/delegated folders](https://learn.microsoft.com/en-us/graph/outlook-share-messages-folders))

## Paging — `next_cursor` is an opaque URL

List tools return `next_cursor`, which is Graph's `@odata.nextLink`. Pass it back verbatim as
`cursor`; don't parse or rebuild it: _"Use the entire URL in the `@odata.nextLink` property in a
GET request to retrieve the next page of results … Don't try to extract the `$skiptoken` or
`$skip` value and use it in a different request."_ ([paging](https://learn.microsoft.com/en-us/graph/paging))

- **listMessages** default page size is **10**, max **1000**: _"The default page size is 10
  messages. Use `$top` to customize the page size, within the range of 1 and 1000."_
  ([list messages](https://learn.microsoft.com/en-us/graph/api/user-list-messages))
- **listCategories** is **not paged** — `masterCategories` returns the full set in one response.
  ([list masterCategories](https://learn.microsoft.com/en-us/graph/api/outlookuser-list-mastercategories))

## Search vs. filter (listMessages, listContacts, listEvents)

- **`search`** is a full-text KQL query over messages. With no property prefix it searches the
  default properties **from, subject, body**; you can also target a property (`subject:invoice`,
  `from:acme`). Message search results are _"sorted by the date and time the message was sent"_ and
  _"A `$search` request returns up to 1,000 results."_
  ([$search](https://learn.microsoft.com/en-us/graph/search-query-parameter)) Because the order is
  fixed to sent date/time, don't expect to control ordering while searching.
- **`filter`** is an OData `$filter` for exact matches (`isRead eq false`, `importance eq 'high'`).
  When `$filter` and `$orderby` are combined on messages, _"Properties that appear in `$orderby`
  must also appear in `$filter`"_ and in the same order.
  ([list messages](https://learn.microsoft.com/en-us/graph/api/user-list-messages))
- **`$search` and `$filter` cannot be combined** on the messages endpoint. Graph rejects
  requests that include both. Use `search` for full-text KQL queries or `filter` for exact OData
  predicates — never both in the same call.
  ([search concept](https://learn.microsoft.com/en-us/graph/search-concept-messages))
- **listContacts** filtering is **limited to email-address match**: _"You can use `$filter`, `any`,
  and the `eq` operator on only the **address** sub-property of instances in an **emailAddresses**
  collection. That is, you can't filter on the **name** or any other sub-property … nor can you
  apply any other operator or function with `filter`, such as `ne`, `le`, and `startswith()`."_
  ([list contacts](https://learn.microsoft.com/en-us/graph/api/user-list-contacts)) For name lookups,
  list and match the returned results client-side.

## Messages

- **sendMail returns `202 Accepted` with no body and no message id.** _"If successful, this method
  returns `202 Accepted` response code. It doesn't return anything in the response body"_ and
  _"A `202 Accepted` response code … doesn't indicate that the request processing has completed.
  Delivery of the message is subject to Exchange Online limitations and throttling."_
  ([sendMail](https://learn.microsoft.com/en-us/graph/api/user-sendmail)) When you need the sent
  message's id, use **createDraft** (returns the draft id) then **sendDraft**.
- **saveToSentItems** defaults to true: _"Specify it only if the parameter is false; default is
  true."_ (same source) Reply, reply-all, and forward also save to Sent Items.
  ([message resource](https://learn.microsoft.com/en-us/graph/api/resources/message))
- **createReplyDraft / forward draft** create a draft pre-populated with the original recipients
  and quoted body that you can edit and send later: _"Create a draft to reply to the sender of a
  message … You can update the draft later … Send the draft message in a subsequent operation."_
  ([createReply](https://learn.microsoft.com/en-us/graph/api/message-createreply))
- **deleteMessage is a soft delete.** The message moves to the **Deleted Items** folder —
  _"deleteditems: The folder items are moved to when they're deleted"_ — and `deleteMessage`
  returns `204 No Content`. A separate _"Permanently delete"_ operation purges items; this
  connector does not expose it. ([mailFolder](https://learn.microsoft.com/en-us/graph/api/resources/mailfolder),
  [delete message](https://learn.microsoft.com/en-us/graph/api/message-delete))
- **updateMessage** is a PATCH: only the fields you send change. **categories REPLACE** the existing
  set (read current via getMessage and include them to append). Subject/body are editable only on
  drafts.
- **bodyPreview** is _"The first 255 characters of the message body. It is in text format."_ — use
  getMessage for the full body. ([message resource](https://learn.microsoft.com/en-us/graph/api/resources/message))
- **getMessage** body format is controlled by `Prefer: outlook.body-content-type` (text or html);
  this connector defaults to text. ([list messages](https://learn.microsoft.com/en-us/graph/api/user-list-messages))

### Well-known folder names

`folderId` / `destinationId` / `parentFolderId` accept either a folder id or a well-known name —
_"Instead of using the corresponding folder id value, for convenience, you can use the well-known
folder names."_ Common ones: `inbox`, `drafts`, `sentitems`, `deleteditems`, `archive`, `junkemail`.
([mailFolder](https://learn.microsoft.com/en-us/graph/api/resources/mailfolder))

## Attachments

- `hasAttachments` is **false when a message has only inline attachments**: _"This property doesn't
  include inline attachments, so if a message contains only inline attachments, this property is
  false."_ Still call **listAttachments** to be sure. ([message resource](https://learn.microsoft.com/en-us/graph/api/resources/message))
- An attachment is one of three kinds — a **file** (`fileAttachment`), an **item** (`itemAttachment`),
  or a **reference** (`referenceAttachment`). ([attachment](https://learn.microsoft.com/en-us/graph/api/resources/attachment))
- **getAttachment** returns `contentBytes` (_"The base64-encoded contents of the file"_) only for
  **file** attachments — item and reference attachments carry no inline bytes.
  ([fileAttachment](https://learn.microsoft.com/en-us/graph/api/resources/fileattachment))
- **Outgoing attachments must be under 3 MB** and are sent inline (base64) in the same request:
  _"If the file size is under 3 MB, do a single POST on the attachments navigation property … If
  the file size is between 3 MB and 150 MB, create an upload session."_
  ([large attachments](https://learn.microsoft.com/en-us/graph/outlook-large-attachments)) This
  connector supports only the under-3-MB inline path; larger files (which require an upload session)
  are not supported and surface as a `413`.

## Calendar

- **listEvents** returns single events **plus recurring series masters** (the recurrence
  definition), not expanded occurrences: _"The list contains single instance meetings and series
  masters."_ ([event resource](https://learn.microsoft.com/en-us/graph/api/resources/event))
- **seriesMaster vs. occurrence:** Calling `updateEvent` or `deleteEvent` with a `seriesMaster`
  id affects **all instances of the recurring series**. To update or delete a single occurrence
  without touching the rest of the series, pass the occurrence or exception id from
  `listCalendarView` (which expands series into individual occurrences over a time window).
  _"If an event is the series master of a recurring event, the changes apply to the entire
  recurring series."_
  ([update event](https://learn.microsoft.com/en-us/graph/api/event-update))
- **listCalendarView** expands recurring series into individual occurrences over a time window:
  _"Get the occurrences, exceptions and single instances of events in a calendar view defined by a
  time range."_ Its `startDateTime`/`endDateTime` are interpreted by their offset, **defaulting to
  UTC** when none is given: _"If no timezone offset is included in the value, it is interpreted as
  UTC."_ (`$top` range is 1–1000.) ([list calendarView](https://learn.microsoft.com/en-us/graph/api/calendar-list-calendarview))
- **Event start/end** are `{ dateTime, timeZone }`. `dateTime` is a **naive local timestamp** in
  the form `{date}T{time}` (e.g. `2026-07-01T15:30:00`) with **no trailing Z or offset** — the zone
  goes in the separate `timeZone` field. `timeZone` accepts a **Windows name** (e.g. _"Pacific
  Standard Time"_) _"as well as the other time zones supported by the calendar API"_ (IANA names
  such as `America/Los_Angeles` are listed). ([dateTimeTimeZone](https://learn.microsoft.com/en-us/graph/api/resources/datetimetimezone))
- **All-day events**: _"If true, regardless of whether it's a single-day or multi-day event, start,
  and endtime must be set to midnight and be in the same time zone."_
  ([event resource](https://learn.microsoft.com/en-us/graph/api/resources/event)) In practice `end`
  is midnight of the day **after** the last day (so a one-day all-day event ends on the next day's
  midnight) — shown in Microsoft Q&A examples; the API reference states only the midnight + same-zone
  requirement.
- **isOnlineMeeting**: set true to attach an online (Teams) meeting — _"After you set
  isOnlineMeeting to true, Microsoft Graph initializes onlineMeeting"_ and the provider is
  `teamsForBusiness`. ([event resource](https://learn.microsoft.com/en-us/graph/api/resources/event))
- **updateEvent attendees REPLACE** the existing list — read current via getEvent, append, then
  update. (PATCH sends only the fields you set.)
- **createEvent and updateEvent send attendee notifications.** When attendees are included,
  Graph automatically sends meeting request or update emails to them: _"When you create an event
  in a user's calendar, the server sends invitations to all attendees."_
  ([create event](https://learn.microsoft.com/en-us/graph/api/user-post-events)) Updating an
  event with attendees similarly dispatches update notifications to all attendees. To avoid
  unwanted emails, omit the `attendees` array on updates that don't change attendees.
- **deleteEvent** cancels the event; for meetings you organize, attendees are notified
  (Graph exposes a _"Cancel event"_ that _"Send[s] a cancellation message from the organizer to all
  the attendees"_). ([event resource](https://learn.microsoft.com/en-us/graph/api/resources/event))
- Output enum values are Graph's own: `showAs` ∈ `free, tentative, busy, oof, workingElsewhere,
unknown`; event `type` ∈ `singleInstance, occurrence, exception, seriesMaster`; `sensitivity` ∈
  `normal, personal, private, confidential`. ([event resource](https://learn.microsoft.com/en-us/graph/api/resources/event))
  Attendee `type` ∈ `required, optional, resource`; the attendee `status.response` is one of
  `none, accepted, declined`, etc. ([attendee](https://learn.microsoft.com/en-us/graph/api/resources/attendee))

## Contacts

- A personal contact stores up to **three email addresses** — the resource exposes
  `primaryEmailAddress`, `secondaryEmailAddress`, and `tertiaryEmailAddress`.
  ([contact resource](https://learn.microsoft.com/en-us/graph/api/resources/contact))
- **updateContact** array fields (`emailAddresses`, `businessPhones`) **replace** existing values —
  read current via getContact and merge.
- Updating other properties may auto-regenerate `displayName`: _"later updates to other properties
  may cause an automatically generated value to overwrite the displayName value you have specified.
  To preserve a pre-existing value, always include it as displayName."_
  ([contact resource](https://learn.microsoft.com/en-us/graph/api/resources/contact))

## Categories

Categories are user-defined names in a **master list**; you apply one by assigning its
`displayName` to an item's `categories`: _"You can apply a category to an item by assigning the
displayName property of the category to the categories collection of the item."_ Each category's
**color** is a preset constant (`None`, `preset0`, `preset1`, … up to 25 colors) that comes from the
master-list entry. ([outlookCategory](https://learn.microsoft.com/en-us/graph/api/resources/outlookcategory))
Use **listCategories** to discover the valid names. Categories are per-user (no `mailbox` option).

## Errors, recovery & throttling

Graph returns a JSON error envelope: a single `error` object with `code` (machine-readable) and
`message`. _"You should only code against error codes returned in `code` properties."_
([errors](https://learn.microsoft.com/en-us/graph/errors)) Common statuses
([HTTP status codes](https://learn.microsoft.com/en-us/graph/errors)):

| Status | Meaning                                                                                              | Recovery                                                                                      |
| ------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `401`  | _"Required authentication information is either missing or not valid."_                              | Reconnect the Outlook account (token invalid/expired).                                        |
| `403`  | _"Access is denied … The user does not have enough permission or does not have a required license."_ | Reconnect to grant the permission; shared-mailbox access also needs Exchange-side delegation. |
| `404`  | _"The requested resource doesn't exist."_                                                            | The id may be stale — re-fetch it from the relevant list/get tool and retry.                  |
| `413`  | _"The request size exceeds the maximum limit."_                                                      | Attachment too large — keep inline attachments under 3 MB.                                    |
| `429`  | _"Client application has been throttled."_                                                           | Back off, then retry.                                                                         |

**Throttling (`429`)**: Graph _"Returns HTTP status code 429 Too Many Requests"_ and _"Returns a
suggested wait time in the response header of the failed request."_ Best practice: _"Wait the number
of seconds specified in the `Retry-After` header"_ and retry.
([throttling](https://learn.microsoft.com/en-us/graph/throttling))
