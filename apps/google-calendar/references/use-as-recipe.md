# Using Google Calendar when you write your own code

This is the write-your-own-code shape: you have no pre-registered tools, no
terminal/subprocess, and no way to `import` this package in-process (for
example, a code-execution sandbox that only runs snippets you author). You
call the Google Calendar API v3 directly. This page teaches you the request
and response shapes this connector's own scripts build and parse, so you can
write equivalent calls yourself.

## Auth & base URL

All calls target `https://www.googleapis.com/calendar/v3/` (`freeBusy` and
`colors` hang directly off that root; calendar list is
`users/me/calendarList`). Every request needs an
`Authorization: Bearer <access-token>` header — how you obtain and refresh
that token is outside this connector's scope. For what an expired token, a
too-narrow scope, or a too-low access role on a calendar look like on the
wire (and how to recover from each), see
[Errors: read `error.errors[].reason`, not just the HTTP status](google-calendar-api-gotchas.md#errors-read-errorerrorsreason-not-just-the-http-status)
in the gotchas doc.

## Error-handling pattern

Every call in this connector follows the same shape: make the request, then
check whether it succeeded before trying to parse a success body — a failed
request's body is Google's error envelope, not the resource you asked for.
Two mechanical wrinkles worth copying:

- **`deleteEvent` special-cases HTTP 410.** It checks for 410 before general
  error handling and returns a success result for it instead of raising;
  `deleteAclRule` has no such special case. For what 410 means here and why
  that's the right call, see
  [Errors: read `error.errors[].reason`, not just the HTTP status](google-calendar-api-gotchas.md#errors-read-errorerrorsreason-not-just-the-http-status).
- **Delete calls have no success body.** Google's delete endpoints return an
  empty body on success; if your own code needs a return value, synthesize
  one (e.g. `{ success: true }`) rather than trying to parse JSON out of an
  empty response.

For every other status code, the exact envelope shape and what each
`error.errors[].reason` value means (401, 403 `rateLimitExceeded` /
`insufficientPermissions`, 404, 410) is documented once — read
[Errors: read `error.errors[].reason`, not just the HTTP status](google-calendar-api-gotchas.md#errors-read-errorerrorsreason-not-just-the-http-status)
rather than guessing from the HTTP status alone.

## Request/response shapes per operation family

Field lists below are **structural** — name and type, taken from this
connector's own script schemas — not a claim about which values the API
actually accepts or returns. Where a field's _behavior_ matters (a limit, a
default, an enum's meaning), that's a pointer into the gotchas doc, not
restated here.

### Shared `Event` shape (events.*)

```
Event {
  id?: string
  status?: string
  summary?: string
  description?: string
  location?: string
  start?: EventDateTime
  end?: EventDateTime
  attendees?: Attendee[]
  organizer?: { displayName?: string, email?: string }
  recurrence?: string[]
  reminders?: Reminders
  colorId?: string
  visibility?: "default" | "public" | "private" | "confidential"
  transparency?: "opaque" | "transparent"
  eventType?: "default" | "birthday" | "focusTime" | "fromGmail"
            | "outOfOffice" | "workingLocation"
  guestsCanModify?: boolean
  guestsCanInviteOthers?: boolean
  guestsCanSeeOtherGuests?: boolean
  conferenceData?: ConferenceData
}

EventDateTime = { date: string } | { dateTime: string, timeZone?: string }

Attendee { email: string, displayName?: string, responseStatus?: string, organizer?: boolean }

Reminders { useDefault?: boolean, overrides?: { method: string, minutes: number }[] }

ConferenceData {
  createRequest?: { requestId: string, conferenceSolutionKey: { type: "hangoutsMeet" } }
  status?: { statusCode: "pending" | "success" | "failure" }
  entryPoints?: unknown[]
}
```

Building `start`/`end` (all-day vs. timed vs. recurring) and the exact
`timeMin`/`timeMax`/`recurrence` string format your requests must use is
governed by the API, not this connector — see
[Dates & times](google-calendar-api-gotchas.md#dates--times) and
[Recurring events](google-calendar-api-gotchas.md#recurring-events).
`eventType`'s creation constraints (which types can even be created, and
under what conditions) are in
[Event types and their creation constraints](google-calendar-api-gotchas.md#event-types-and-their-creation-constraints).
`colorId` semantics are in [Colors](google-calendar-api-gotchas.md#colors).
Requesting one is a two-part write: send `conferenceData.createRequest`
with a fresh `requestId` and `conferenceSolutionKey.type: "hangoutsMeet"`,
_and_ add the `conferenceDataVersion=1` query parameter — for why both are
required, and how to read the resolved link back, see
[Google Meet conferences are created asynchronously](google-calendar-api-gotchas.md#google-meet-conferences-are-created-asynchronously).
`reminders` limits are in
[Reminders](google-calendar-api-gotchas.md#reminders).

**Note on `timeMin`/`timeMax`:** this connector accepts a bare `YYYY-MM-DD`
as a convenience and locally expands it to a full timestamp using the
calendar's own timezone (fetched via `calendars.get` when needed) before it
ever reaches Google. That expansion is this connector's own mechanism, not
something the raw API does for you — if you're calling the API directly,
send a fully-qualified RFC3339 timestamp with an offset (or resolve the
calendar's timezone yourself first).

### Events — operations

| Operation                | Method + path                                                                                                                                        | Query / body                                                                                                                                                                                      | Response                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Create                   | `POST /calendars/{calendarId}/events`                                                                                                                | query: `sendUpdates`, `conferenceDataVersion` (if requesting Meet); body: `Event` fields                                                                                                          | `Event`                                      |
| Quick add                | `POST /calendars/{calendarId}/events/quickAdd`                                                                                                       | query: `text`, `sendUpdates`; no body                                                                                                                                                             | `Event`                                      |
| Update (patch)           | `PATCH /calendars/{calendarId}/events/{eventId}`                                                                                                     | query: `sendUpdates`, `conferenceDataVersion`; body: only the `Event` fields you want changed — omit a field entirely to leave it alone                                                           | `Event`                                      |
| Add attendees (compound) | `GET` the event, union new emails into `attendees` by lower-cased email, then `PATCH /calendars/{calendarId}/events/{eventId}` with the merged array | query: `sendUpdates`; body: `{ attendees: Attendee[] }` (the full merged roster)                                                                                                                  | `Event`                                      |
| Move                     | `POST /calendars/{calendarId}/events/{eventId}/move`                                                                                                 | query: `destination`, `sendUpdates`; no body                                                                                                                                                      | `Event`                                      |
| Delete                   | `DELETE /calendars/{calendarId}/events/{eventId}`                                                                                                    | query: `sendUpdates`                                                                                                                                                                              | empty body                                   |
| Get                      | `GET /calendars/{calendarId}/events/{eventId}`                                                                                                       | —                                                                                                                                                                                                 | `Event`                                      |
| List / search            | `GET /calendars/{calendarId}/events`                                                                                                                 | query: `timeMin`, `timeMax`, `q`, `singleEvents`, `orderBy`, `eventTypes` (repeated, e.g. `eventTypes=default&eventTypes=focusTime` — not comma-joined), `showDeleted`, `maxResults`, `pageToken` | `{ items: Event[], nextPageToken?: string }` |
| List instances           | `GET /calendars/{calendarId}/events/{eventId}/instances`                                                                                             | query: `timeMin`, `timeMax`, `maxResults`, `pageToken`                                                                                                                                            | `{ items: Event[], nextPageToken?: string }` |

The "add attendees" row is a **read-modify-write, not a single call** — a
one-shot `PATCH` of `attendees` replaces the whole array, which is exactly
why a single request can't safely add a guest. See
[Updates are partial; array fields replace](google-calendar-api-gotchas.md#updates-are-partial-array-fields-replace).
Only `default`-type events can be moved — see
[Event types and their creation constraints](google-calendar-api-gotchas.md#event-types-and-their-creation-constraints).
`timeMin`/`timeMax`/`q` semantics, `singleEvents`/`orderBy` interaction, and
`showDeleted` are covered in
[Listing & searching events](google-calendar-api-gotchas.md#listing--searching-events)
and [Recurring events](google-calendar-api-gotchas.md#recurring-events).
Page-size limits are in
[Pagination & page size](google-calendar-api-gotchas.md#pagination--page-size).
`sendUpdates` values and what they do server-side are in
[Notifications: `sendUpdates`](google-calendar-api-gotchas.md#notifications-sendupdates).

### Calendars

```
CalendarListEntry {
  id: string
  summary?: string
  description?: string
  timeZone?: string
  accessRole?: "freeBusyReader" | "reader" | "writer" | "owner"
  primary?: boolean
  colorId?: string
  backgroundColor?: string
  selected?: boolean
  hidden?: boolean
  defaultReminders?: { method?: string, minutes?: number }[]
  conferenceProperties?: { allowedConferenceSolutionTypes?: string[] }
}

Calendar {
  id: string
  summary?: string
  description?: string
  location?: string
  timeZone?: string
  conferenceProperties?: { allowedConferenceSolutionTypes?: string[] }
  etag?: string
  kind?: string
}
```

| Operation | Method + path                 | Query / body                                                                   | Response                                                 |
| --------- | ----------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------- |
| List      | `GET /users/me/calendarList`  | query: `minAccessRole`, `showHidden`, `showDeleted`, `maxResults`, `pageToken` | `{ items: CalendarListEntry[], nextPageToken?: string }` |
| Get       | `GET /calendars/{calendarId}` | —                                                                              | `Calendar`                                               |
| Create    | `POST /calendars`             | body: `{ summary, description?, timeZone?, location? }`                        | `Calendar`                                               |

What `accessRole` gates, and which role each calendar operation needs, is in
[Calendars & access roles](google-calendar-api-gotchas.md#calendars--access-roles).

### Free/busy

```
POST /freeBusy
body: { timeMin: string, timeMax: string, timeZone?: string, items: { id: string }[] }
→ { calendars: { [calendarId: string]: {
      busy: { start: string, end: string }[],
      errors?: { domain?: string, reason?: string }[]
    } } }
```

A calendar-id list maps onto the wire's `items: [{ id }, ...]` shape, not a
bare string array. What a per-calendar `errors` entry means (and that it
doesn't fail the rest of the response) is in
[Free/busy](google-calendar-api-gotchas.md#freebusy).

### Colors

```
GET /colors  (no input)
→ {
    event: { [colorId: string]: { background?: string, foreground?: string } },
    calendar: { [colorId: string]: { background?: string, foreground?: string } }
  }
```

`colorId` is an index into this palette, not a hex value — see
[Colors](google-calendar-api-gotchas.md#colors).

### Sharing (ACL)

```
AclRule {
  id: string
  role: "none" | "freeBusyReader" | "reader" | "writer" | "owner"
  scope: { type: "user" | "group" | "domain" | "default", value?: string }
}
```

| Operation       | Method + path                                 | Query / body                                        | Response                                       |
| --------------- | --------------------------------------------- | --------------------------------------------------- | ---------------------------------------------- |
| List            | `GET /calendars/{calendarId}/acl`             | query: `maxResults`, `pageToken`                    | `{ items: AclRule[], nextPageToken?: string }` |
| Create / change | `POST /calendars/{calendarId}/acl`            | query: `sendNotifications`; body: `{ role, scope }` | `AclRule`                                      |
| Delete          | `DELETE /calendars/{calendarId}/acl/{ruleId}` | —                                                   | empty body                                     |

Inserting a rule for a `scope` that already has one updates that rule
rather than erroring. Every ACL operation needs the `owner` role on the
calendar — see [Sharing (ACL)](google-calendar-api-gotchas.md#sharing-acl)
and [Errors: read `error.errors[].reason`, not just the HTTP status](google-calendar-api-gotchas.md#errors-read-errorerrorsreason-not-just-the-http-status).

## Critical rules — read before you write code against a given area

Each of these is a real vendor-behavior constraint; follow the link rather
than trusting a paraphrase (including this one):

- Interpreting any non-2xx response → [Errors: read `error.errors[].reason`, not just the HTTP status](google-calendar-api-gotchas.md#errors-read-errorerrorsreason-not-just-the-http-status)
- Building `start`/`end`, or any `timeMin`/`timeMax` → [Dates & times](google-calendar-api-gotchas.md#dates--times)
- Expanding or editing occurrences of a recurring event → [Recurring events](google-calendar-api-gotchas.md#recurring-events)
- Choosing or creating an `eventType` → [Event types and their creation constraints](google-calendar-api-gotchas.md#event-types-and-their-creation-constraints)
- Resolving a `colorId` → [Colors](google-calendar-api-gotchas.md#colors)
- Requesting or reading back a Google Meet link → [Google Meet conferences are created asynchronously](google-calendar-api-gotchas.md#google-meet-conferences-are-created-asynchronously)
- Choosing a `sendUpdates` value → [Notifications: `sendUpdates`](google-calendar-api-gotchas.md#notifications-sendupdates)
- Paging any list endpoint → [Pagination & page size](google-calendar-api-gotchas.md#pagination--page-size)
- Building a search (`q`, `showDeleted`, `singleEvents`/`orderBy`) → [Listing & searching events](google-calendar-api-gotchas.md#listing--searching-events)
- Sending `attendees`, `recurrence`, or `reminders.overrides` on an update → [Updates are partial; array fields replace](google-calendar-api-gotchas.md#updates-are-partial-array-fields-replace)
- Setting reminder overrides → [Reminders](google-calendar-api-gotchas.md#reminders)
- Reading `accessRole` or finding a writable calendar → [Calendars & access roles](google-calendar-api-gotchas.md#calendars--access-roles)
- Sharing or revoking calendar access → [Sharing (ACL)](google-calendar-api-gotchas.md#sharing-acl)
- Interpreting per-calendar free/busy errors → [Free/busy](google-calendar-api-gotchas.md#freebusy)
- Relying on quick-add's text parsing → [Quick add](google-calendar-api-gotchas.md#quick-add)

## Where to go next

- [Errors: read `error.errors[].reason`, not just the HTTP status](google-calendar-api-gotchas.md#errors-read-errorerrorsreason-not-just-the-http-status)
- [Dates & times](google-calendar-api-gotchas.md#dates--times)
- [Recurring events](google-calendar-api-gotchas.md#recurring-events)
- [Event types and their creation constraints](google-calendar-api-gotchas.md#event-types-and-their-creation-constraints)
- [Colors](google-calendar-api-gotchas.md#colors)
- [Google Meet conferences are created asynchronously](google-calendar-api-gotchas.md#google-meet-conferences-are-created-asynchronously)
- [Notifications: `sendUpdates`](google-calendar-api-gotchas.md#notifications-sendupdates)
- [Pagination & page size](google-calendar-api-gotchas.md#pagination--page-size)
- [Listing & searching events](google-calendar-api-gotchas.md#listing--searching-events)
- [Updates are partial; array fields replace](google-calendar-api-gotchas.md#updates-are-partial-array-fields-replace)
- [Reminders](google-calendar-api-gotchas.md#reminders)
- [Calendars & access roles](google-calendar-api-gotchas.md#calendars--access-roles)
- [Sharing (ACL)](google-calendar-api-gotchas.md#sharing-acl)
- [Free/busy](google-calendar-api-gotchas.md#freebusy)
- [Quick add](google-calendar-api-gotchas.md#quick-add)
