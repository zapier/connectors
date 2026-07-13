---
name: google-calendar
description: Agent-callable Google Calendar tools — create, update, move, search, and delete events, manage calendars, check free/busy availability, resolve event colors, and manage calendar sharing. Use when the user mentions Google Calendar or wants to schedule, find, reschedule, or share events and calendars — including requests that do not name Google Calendar explicitly, e.g. "put a meeting on my calendar Tuesday 3pm" or "am I free Friday afternoon".
license: Elastic-2.0
compatibility: Run `npm install` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for prebuilt / alternative-runtime options.
metadata:
  title: Google Calendar
  source: https://github.com/zapier/connectors/blob/main/apps/google-calendar/SKILL.md
  zapier-app-key: GoogleCalendarCLIAPI
  api-docs: https://developers.google.com/workspace/calendar/api/v3/reference
---

# Google Calendar

_Independent, unofficial connector for Google Calendar. Not affiliated with, endorsed by, or sponsored by Google Calendar. "Google Calendar" is a trademark of its owner, used only to identify the service this connector works with._

Tools for managing Google Calendar — create, read, update, move, and delete events; search a calendar; list and create calendars; check free/busy availability; resolve the event-color palette; and manage calendar sharing (ACL). Wraps the [Google Calendar API v3](https://developers.google.com/workspace/calendar/api/v3/reference) (`https://www.googleapis.com/calendar/v3/`). Authentication is OAuth 2.0 over a single connection — capability is gated by scope and by each calendar's access role, not by token type.

## When to use this

- An agent needs to schedule, find, reschedule, move, or cancel calendar events.
- An agent needs to check when someone is busy/free across one or more calendars.
- An agent needs to list or create calendars, or read a calendar's default timezone.
- An agent needs to share a calendar with someone or revoke access (ACL management; requires the `owner` role).

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

If the connector has not been installed as a skill yet, install it first with `npx skills add zapier/connectors --skill google-calendar` (or your harness's own skill-install mechanism), then continue here.

The connector runs on **Node.js 22.18+**. Pick the reference that matches how you're running it, and load it before doing anything else:

| You have...                                                                                                                                                 | Load                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| An MCP-aware client — tools may already be loaded (e.g. `mcp__google-calendar__<tool>`), or you can register a local server yourself (or guide the user to) | [`references/use-as-mcp.md`](references/use-as-mcp.md) |
| Terminal / subprocess access (you can run `node`)                                                                                                           | [`references/use-as-cli.md`](references/use-as-cli.md) |
| Only your own code, importing this package as a dependency                                                                                                  | [`references/use-as-sdk.md`](references/use-as-sdk.md) |

## Scripts

| Script                                                           | Script name          | Connections                  | Description                                                                                       |
| ---------------------------------------------------------------- | -------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------- |
| [`scripts/createEvent.ts`](scripts/createEvent.ts)               | `createEvent`        | Single (`"google-calendar"`) | Create an event (timed/all-day, recurring, attendees, reminders, color, Google Meet).             |
| [`scripts/quickAddEvent.ts`](scripts/quickAddEvent.ts)           | `quickAddEvent`      | Single (`"google-calendar"`) | Create an event from a simple text string — parses a title and date/time.                         |
| [`scripts/updateEvent.ts`](scripts/updateEvent.ts)               | `updateEvent`        | Single (`"google-calendar"`) | Partially update an event. Array fields REPLACE; use addEventAttendees to add guests.             |
| [`scripts/addEventAttendees.ts`](scripts/addEventAttendees.ts)   | `addEventAttendees`  | Single (`"google-calendar"`) | Add guests to an event without removing the existing attendees (read-modify-write).               |
| [`scripts/moveEvent.ts`](scripts/moveEvent.ts)                   | `moveEvent`          | Single (`"google-calendar"`) | Move an event to another calendar (default events only).                                          |
| [`scripts/deleteEvent.ts`](scripts/deleteEvent.ts)               | `deleteEvent`        | Single (`"google-calendar"`) | Delete an event. Idempotent — already-deleted events still report success.                        |
| [`scripts/listEvents.ts`](scripts/listEvents.ts)                 | `listEvents`         | Single (`"google-calendar"`) | List/search events on a calendar by time window, text, or event type.                             |
| [`scripts/getEvent.ts`](scripts/getEvent.ts)                     | `getEvent`           | Single (`"google-calendar"`) | Retrieve a single event by id (e.g. to read a resolved Google Meet link).                         |
| [`scripts/listEventInstances.ts`](scripts/listEventInstances.ts) | `listEventInstances` | Single (`"google-calendar"`) | List the occurrences of a recurring event; resolves instance ids for single-occurrence edits.     |
| [`scripts/listCalendars.ts`](scripts/listCalendars.ts)           | `listCalendars`      | Single (`"google-calendar"`) | List calendars with id, access role, primary flag, and timezone. The primary calendarId resolver. |
| [`scripts/getCalendar.ts`](scripts/getCalendar.ts)               | `getCalendar`        | Single (`"google-calendar"`) | Get a calendar's metadata; getCalendar("primary") returns the user's default timezone.            |
| [`scripts/createCalendar.ts`](scripts/createCalendar.ts)         | `createCalendar`     | Single (`"google-calendar"`) | Create a new secondary calendar.                                                                  |
| [`scripts/queryFreeBusy.ts`](scripts/queryFreeBusy.ts)           | `queryFreeBusy`      | Single (`"google-calendar"`) | Return busy time blocks across one or more calendars in a window.                                 |
| [`scripts/getColors.ts`](scripts/getColors.ts)                   | `getColors`          | Single (`"google-calendar"`) | Return the event + calendar color palettes (colorId index → hex).                                 |
| [`scripts/listAclRules.ts`](scripts/listAclRules.ts)             | `listAclRules`       | Single (`"google-calendar"`) | List a calendar's sharing rules. Requires the `owner` role.                                       |
| [`scripts/createAclRule.ts`](scripts/createAclRule.ts)           | `createAclRule`      | Single (`"google-calendar"`) | Share a calendar with a user/group/domain at a role (or change a share's role). Requires `owner`. |
| [`scripts/deleteAclRule.ts`](scripts/deleteAclRule.ts)           | `deleteAclRule`      | Single (`"google-calendar"`) | Remove a sharing rule (revoke access). Requires `owner`.                                          |

Each script's `inputSchema` / `outputSchema` (Zod) in the script file is the source of truth for its contract.

## Disambiguation & refusals

- **Resolve before you write.** Before creating, moving, or sharing against a calendar or event looked up by name, confirm the target. When resolving a calendar by name via `listCalendars`, count _exact_ (case-insensitive) `summary` matches: exactly one → act on it; two or more that tie → stop, list the candidates with their `id` + `accessRole`, and ask which one. The same applies to events resolved by `listEvents` (a person can have several events with the same title) and to ACL rules resolved by `listAclRules`. Never silently pick the first match.
- **Don't fake unsupported operations.** This connector does **not** rename or delete calendars, clear all events from a calendar (`calendars.clear`), import externally-originated events (`events.import`), do "this-and-following" recurring edits in one call, or set up triggers/notifications (watch channels). If a user asks for one of these, say it's not supported and stop — don't substitute a different tool (e.g. deleting events one by one to simulate "clear the calendar", or patching the master to fake "this and following") and report success for an action you didn't perform. For a single recurring occurrence, use `listEventInstances` → `updateEvent` on the instance id.

## Auth

Every shape passes auth as one connection **selector**, not the secret — a `[<resolver>:]<value>` string. Every connector accepts `zapier:<connection-id>` (Zapier-managed auth — routes through Zapier's auth, retries, and governance layer); some also accept one or more direct-token resolvers (naming and count vary per connector) — check this connector's own resolvers rather than assuming. The `<resolver>:` prefix is optional; a bare value goes to the first resolver that claims it. Each script declares the connections it needs and the resolvers each accepts. The exact syntax for passing a connection (and how to see this connector's resolver list) differs by shape — see the reference you loaded above.

Google Calendar ships two resolvers, Zapier-first: prefer `zapier`; fall back to `env`.

- **`zapier:<connection-id>`** _(recommended)_ — route through a Zapier Google Calendar connection. **Prerequisite: a Zapier account** (free signup at <https://zapier.com>). The user authorises Google once via Zapier's OAuth flow at <https://zapier.com/app/connections>; Zapier then handles token refresh transparently. A bare, UUID-shaped value auto-claims this resolver — no `zapier:` prefix needed.

  **Finding the connection ID** (the connections UI doesn't expose IDs):
  1. Verify auth: `npx zapier-sdk get-profile`. If unauthenticated, run `npx zapier-sdk login` once.
  2. `npx zapier-sdk list-connections GoogleCalendarCLIAPI` — prints `title (connection ID)` per matching connection. Add `--json` for machine-readable output. If the user has multiple Google Calendar connections, list the titles and ask which to use.
  3. If the connection is **shared** with the user (e.g. an org-wide connection), opt in: `npx zapier-sdk --can-include-shared-connections list-connections GoogleCalendarCLIAPI --include-shared`. Ask the user first before retrying with this on.

- **`env:<ENV_VAR>`** _(fallback)_ — read a Google OAuth access token from the named environment variable and send it as `Authorization: Bearer <token>`. The value is the env-var NAME, not the token; the token stays in `env` and never touches argv. **Caveat: Google access tokens expire ~1 hour after issue and this resolver does NOT refresh them** — direct mode suits short-lived/testing use; the Zapier-managed connection (recommended) refreshes transparently.

The connect step grants the `https://www.googleapis.com/auth/calendar` scope (full read/write across events, calendars, freebusy, colors, and ACL). A request made with too narrow a scope returns 403 `insufficientPermissions` — the connector surfaces "reconnect with calendar access". A 403 caused by too low an access _role_ on a specific calendar (e.g. sharing changes need `owner`) is surfaced as a permission error — reconnecting won't fix it; the calendar's owner must grant access.

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

| Reference                                                                   | Covers                                                                                                                                                                                                                           | Load it when                                                                                                                                                                                               |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [google-calendar-api-gotchas.md](references/google-calendar-api-gotchas.md) | The error envelope + recovery, all-day exclusive `end.date`, `timeZone`-required-for-recurrence, event-type creation constraints, async Meet creation, pagination caps, free/busy per-calendar errors, and ACL owner-role rules. | Before building event dates/times, recurrence, colors, or Google Meet links; when handling 401/403/404/410 errors; when updating events (array fields replace wholesale); or when sharing calendars (ACL). |
