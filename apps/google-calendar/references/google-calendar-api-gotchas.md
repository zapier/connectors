# Google Calendar API — gotchas

Behavioral surprises in the Google Calendar API (v3) that affect how the tools
behave. Every claim below is sourced to the public Google Calendar API docs.

## Errors: read `error.errors[].reason`, not just the HTTP status

Failed requests return a JSON body shaped
`{ "error": { "code", "message", "errors": [ { "domain", "reason", "message" } ] } }`
— the `reason` string is what tells you the recovery, and the same shape is used
across the whole API.
([Handle API errors](https://developers.google.com/calendar/api/guides/errors))

- **401** — "The access token you're using is either expired or invalid." Get a
  new token from the refresh token; if that fails, send the user back through
  the OAuth flow (in Zapier terms: reconnect).
  ([errors](https://developers.google.com/calendar/api/guides/errors))
- **403 `rateLimitExceeded` / `userRateLimitExceeded` / `quotaExceeded`** — a
  rate or quota limit was hit. `rateLimitExceeded` "errors can return either 403
  or 429 error codes." Recover with **exponential backoff** (add jitter); the
  docs prescribe backoff and do not document a `Retry-After` header.
  ([errors](https://developers.google.com/calendar/api/guides/errors))
- **403 (access/role)** — sharing and ACL operations require the **owner** role:
  the owner role is the one with "the additional ability to see and modify
  access levels of other users," and "The owners of a calendar can share the
  calendar by giving access to other users." Reconnecting will not help; the
  caller needs a higher role on that calendar.
  ([CalendarList resource](https://developers.google.com/calendar/api/v3/reference/calendarList),
  [Calendar sharing](https://developers.google.com/calendar/api/concepts/sharing))
- **403 `insufficientPermissions`** — the granted OAuth scope is too narrow for
  the operation; reconnect with calendar (read/write) access.
  ([Choose API scopes](https://developers.google.com/workspace/calendar/api/auth))
- **404 `notFound`** — "The specified resource was not found." Re-resolve the id
  (calendars via `listCalendars`, events via `listEvents`).
  ([errors](https://developers.google.com/calendar/api/guides/errors))
- **410 `Gone`** on delete — returned when "a request attempts to delete an
  event that has already been deleted." `deleteEvent` treats this as success
  (the event is already gone).
  ([errors](https://developers.google.com/calendar/api/guides/errors))

## Dates & times

- **All-day `end.date` is EXCLUSIVE.** `events.insert` documents `end` as "The
  (exclusive) end time of the event." A single all-day event therefore has
  `end.date = start.date + 1` (the day _after_ the last day).
  ([events.insert](https://developers.google.com/calendar/api/v3/reference/events/insert))
- **Timed `dateTime` needs an offset _or_ a `timeZone`.** `start.dateTime` is
  "formatted according to RFC3339" and "A time zone offset is required unless a
  time zone is explicitly specified in `timeZone`."
  ([Events resource](https://developers.google.com/calendar/api/v3/reference/events))
- **`timeZone` is required for recurring events.** It is an IANA Time Zone
  Database name (e.g. `America/Los_Angeles`), and "For recurring events this
  field is required and specifies the time zone in which the recurrence is
  expanded."
  ([Events resource](https://developers.google.com/calendar/api/v3/reference/events))

## Recurring events

- **Expansion is opt-in.** `singleEvents` controls "Whether to expand recurring
  events into instances and only return single one-off events and instances of
  recurring events, but not the underlying recurring events themselves." Without
  it you get the recurring master, not the occurrences.
  ([events.list](https://developers.google.com/calendar/api/v3/reference/events/list))
- **`orderBy=startTime` requires `singleEvents=true`** — `startTime` ordering "is
  only available when querying single events (i.e. the parameter `singleEvents`
  is True)." `updated` ordering works either way.
  ([events.list](https://developers.google.com/calendar/api/v3/reference/events/list))
- **Edit one occurrence via its instance id.** `listEventInstances` returns the
  individual occurrences; patch a single occurrence's id with `updateEvent` —
  patching the recurring master changes the whole series.
  ([events.instances](https://developers.google.com/calendar/api/v3/reference/events/instances))
- **`recurrence` is RFC5545 and replaces wholesale.** The field is a "List of
  RRULE, EXRULE, RDATE and EXDATE lines for a recurring event, as specified in
  RFC5545. Note that DTSTART and DTEND lines are not allowed in this field."
  (DTSTART is derived from `start`.) On `updateEvent`, sending `recurrence`
  replaces the existing recurrence entirely. For a timed series, an `RRULE`
  `UNTIL` value must be in UTC per RFC5545.
  ([Events resource](https://developers.google.com/calendar/api/v3/reference/events),
  [RFC5545 §3.3.10](https://www.rfc-editor.org/rfc/rfc5545#section-3.3.10))

## Event types and their creation constraints

`eventType` is one of `birthday`, `default`, `focusTime`, `fromGmail`,
`outOfOffice`, `workingLocation`.
([events.list](https://developers.google.com/calendar/api/v3/reference/events/list))

- **`fromGmail` cannot be created.** The Events resource states for `fromGmail`:
  "This type of event cannot be created."
  ([Events resource](https://developers.google.com/calendar/api/v3/reference/events))
- **`birthday` _can_ be created, but is constrained.** "The API allows creating
  birthday events using the `insert` method" provided "start and end fields need
  to define an all-day event which spans exactly one day," the "visibility field
  value must be 'private'," the "transparency field value must be 'transparent'",
  and it must "Need to have an annual recurrence." (Because of these constraints
  this connector's `createEvent` does not expose `birthday`.)
  ([Event types](https://developers.google.com/calendar/api/guides/event-types))
- **`outOfOffice` and `focusTime` must be timed + busy + on a primary calendar.**
  For both: "Set the event's `start` and `end` fields to be a timed event (with
  start and end times specified)" — they "cannot be all-day events" — and "Set
  the `transparency` field to `'opaque'`." "These features are only available on
  primary calendars," and "Secondary calendars can't have status events."
  ([Manage focus time, out of office, and working location](https://developers.google.com/workspace/calendar/api/guides/calendar-status))
- **Only `default` events can be moved.** `events.move` documents: "Note that
  only `default` events can be moved; `birthday`, `focusTime`, `fromGmail`,
  `outOfOffice` and `workingLocation` events cannot be moved."
  ([events.move](https://developers.google.com/calendar/api/v3/reference/events/move))

## Colors

`colorId` is a palette **index**, not a hex value: it is "an ID referring to an
entry in the `event` section of the colors definition (see the colors
endpoint)." Resolve the available indexes with `getColors`, which "Returns the
color definitions for calendars and events" as maps keyed by color id, each
entry carrying `background` / `foreground` hex.
([Events resource](https://developers.google.com/calendar/api/v3/reference/events),
[colors.get](https://developers.google.com/calendar/api/v3/reference/colors/get))

> The API documents only the _structure_ of the palette (a map keyed by id), not
> a fixed numeric range. Observed today, `getColors` returns event ids `1`–`11`
> and calendar ids `1`–`24`; treat `getColors` as the source of truth rather
> than hard-coding the range.

## Google Meet conferences are created asynchronously

Attaching a Meet link is a two-step, eventually-consistent flow. The create call
returns `conferenceData.createRequest.status.statusCode` of `pending`; the
allowed status codes are `pending`, `success`, and `failure`. Conference
creation also requires `conferenceDataVersion=1` — "Version 1 enables support
for ... creating new conferences using the createRequest field" (version 0
"ignores conference data in the event's body"). Once the status is `success`,
read the resolved link from `conferenceData.entryPoints`. The connector handles
the version flag and the `createRequest`; the agent just re-reads with `getEvent`
until the status is `success`.
([Events resource](https://developers.google.com/calendar/api/v3/reference/events),
[events.insert](https://developers.google.com/calendar/api/v3/reference/events/insert))

## Notifications: `sendUpdates`

Write tools take `sendUpdates`: "`all`": "Notifications are sent to all guests."
"`externalOnly`": "Notifications are sent to non-Google Calendar guests only."
"`none`": "No notifications are sent." The connector defaults to `all` so guests
are not silently left uninvited.
([events.insert](https://developers.google.com/calendar/api/v3/reference/events/insert))

## Pagination & page size

List tools page via `pageToken` ("Token used to access the next page of this
result"); the connector surfaces it as `next_page_token`. Page-size caps come
from the API: `events.list` / `events.instances` — "The page size can never be
larger than 2500 events"; `calendarList.list` — "The page size can never be
larger than 250 entries"; the ACL list is likewise capped at 250.
([events.list](https://developers.google.com/calendar/api/v3/reference/events/list),
[calendarList.list](https://developers.google.com/calendar/api/v3/reference/calendarList/list))

## Listing & searching events

- **Time-window bounds are exclusive and cross-compared.** `timeMin` is the
  "Lower bound (exclusive) for an event's end time to filter by"; `timeMax` is
  the "Upper bound (exclusive) for an event's start time to filter by." Both are
  RFC3339 with an offset.
  ([events.list](https://developers.google.com/calendar/api/v3/reference/events/list))
- **`q` searches a fixed set of fields.** Free-text search matches "`summary`,
  `description`, `location`, attendee's `displayName`, attendee's `email`,
  organizer's `displayName`, organizer's `email`," and working-location fields.
  (Extended properties and attachments are not in the documented match list.)
  ([events.list](https://developers.google.com/calendar/api/v3/reference/events/list))
- **`showDeleted`** includes "deleted events (with `status` equals
  "`cancelled`")."
  ([events.list](https://developers.google.com/calendar/api/v3/reference/events/list))

## Updates are partial; array fields replace

`updateEvent` (events.patch) only changes the fields you send — but array-valued
fields are **replaced wholesale**, not merged: "Array fields, if specified,
overwrite the existing arrays; this discards any previous array elements." So
sending `attendees` (or `recurrence`, `reminders.overrides`) replaces the whole
list. To add a guest without dropping the others, use `addEventAttendees` (it
reads the current roster, unions in the new emails, and writes it back).
([events.patch](https://developers.google.com/calendar/api/v3/reference/events/patch))

## Reminders

`reminders.useDefault` is "Whether the default reminders of the calendar apply to
the event" — when true, the event uses the calendar defaults and `overrides` do
not apply. "The maximum number of override reminders is 5," and each override's
`minutes` has "Valid values are between 0 and 40320 (4 weeks in minutes)."
([Events resource](https://developers.google.com/calendar/api/v3/reference/events))

## Calendars & access roles

- `listCalendars` reports `accessRole`, "The effective access role that the
  authenticated user has on the calendar," one of `freeBusyReader`, `reader`,
  `writer`, `owner`. This gates what the connection can do — filter
  `minAccessRole=writer` to find writable calendars.
  ([CalendarList resource](https://developers.google.com/calendar/api/v3/reference/calendarList))
- `createCalendar` "Creates a secondary calendar" owned by the connected user;
  the returned `id` is the handle for `createEvent`, `createAclRule`, etc.
  ([calendars.insert](https://developers.google.com/calendar/api/v3/reference/calendars/insert))
- Each user "has owner access to their primary calendar, and this access cannot
  be relinquished."
  ([Calendar sharing](https://developers.google.com/calendar/api/concepts/sharing))

## Sharing (ACL)

`createAclRule` grants a `role` (`none`, `freeBusyReader`, `reader`, `writer`,
`owner`) to a `scope`. Scope type `default` is "The public scope" — "The
permissions granted to the "`default`", or public, scope apply to any user,
authenticated or not"; `user` / `group` / `domain` limit it to an email or
domain. `sendNotifications` controls "Whether to send notifications about the
calendar sharing change." Reading or changing a calendar's ACL requires the
owner role (see Errors → 403 above).
([acl.insert](https://developers.google.com/calendar/api/v3/reference/acl/insert))

## Free/busy

`queryFreeBusy` returns busy blocks keyed by calendar id. A bad calendar id is
**not** a whole-request failure: the response carries an optional per-calendar
`errors` entry (e.g. `notFound`) "if computation for the calendar failed,"
alongside the others' busy blocks. The response `timeZone` "default is UTC."
([freebusy.query](https://developers.google.com/calendar/api/v3/reference/freebusy/query))

## Quick add

`quickAddEvent` "Creates an event based on a simple text string" (e.g. "Lunch
with Sam tomorrow 12pm") — it parses a title and date/time. For attendees,
recurrence, conferencing, or location, use `createEvent`.
([events.quickAdd](https://developers.google.com/calendar/api/v3/reference/events/quickAdd))
