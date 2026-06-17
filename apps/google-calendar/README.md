# @zapier/google-calendar-connector

Agent-callable [Google Calendar](https://developers.google.com/workspace/calendar/api/v3/reference) tools. Create, read, update, move, and delete events; search a calendar; list and create calendars; check free/busy availability; resolve the event-color palette; and manage calendar sharing (ACL) — all over the Google Calendar API v3. Authentication is OAuth 2.0 over a single connection; capability is gated by scope and by each calendar's access role, not by token type. Use it when an agent needs to schedule, find, reschedule, or share calendar events and availability.

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

## Install

```bash
# Run a tool with zero install — npx fetches the package on first use
GOOGLE_CALENDAR_ACCESS_TOKEN=xxx npx @zapier/google-calendar-connector run listEvents '{"calendarId":"primary"}' --connection env:GOOGLE_CALENDAR_ACCESS_TOKEN

# Install as a dependency to import the tools in your own code
npm install @zapier/google-calendar-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills zapier/connectors --skill google-calendar
```

Credentials are environment-variable only (never passed on argv — the `--connection` value names the env var, not the secret). Use `--connection zapier:<connection-id>` with `GOOGLE_CALENDAR_ZAPIER_CONNECTION_ID` to route through Zapier-managed auth (recommended — Zapier refreshes the OAuth token transparently); direct `env:GOOGLE_CALENDAR_ACCESS_TOKEN` tokens expire ~1 hour after issue and are not refreshed. See [`SKILL.md`](SKILL.md#auth) for tradeoffs and how to find a connection ID.

## Tools

| Tool                 | Description                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `createEvent`        | Create an event (timed/all-day, recurring, attendees, reminders, color, Google Meet).         |
| `quickAddEvent`      | Create an event from a natural-language phrase (lossy — title + time only).                   |
| `updateEvent`        | Partially update an event (array fields replace; use `addEventAttendees` to add guests).      |
| `addEventAttendees`  | Add guests to an event without removing the existing attendees.                               |
| `moveEvent`          | Move an event to another calendar (default events only).                                      |
| `deleteEvent`        | Delete an event (idempotent — already-deleted events still succeed).                          |
| `listEvents`         | List/search events on a calendar by time window, text, or event type.                         |
| `getEvent`           | Retrieve a single event by id (e.g. to read a resolved Google Meet link).                     |
| `listEventInstances` | List the occurrences of a recurring event; resolves instance ids for single-occurrence edits. |
| `listCalendars`      | List calendars with id, access role, primary flag, and timezone.                              |
| `getCalendar`        | Get a calendar's metadata; `getCalendar("primary")` returns the user's default timezone.      |
| `createCalendar`     | Create a new secondary calendar.                                                              |
| `queryFreeBusy`      | Return busy time blocks across one or more calendars in a window.                             |
| `getColors`          | Return the event + calendar color palettes (colorId index → hex).                             |
| `listAclRules`       | List a calendar's sharing rules (requires the `owner` role).                                  |
| `createAclRule`      | Share a calendar with a user/group/domain at a role (requires `owner`).                       |
| `deleteAclRule`      | Remove a sharing rule / revoke access (requires `owner`).                                     |

Run `npx @zapier/google-calendar-connector run <toolName> --help` to see any tool's exact input contract + which auth env vars are set.

## Usage

```ts
import { createEvent } from "@zapier/google-calendar-connector";

// Each named export is the consumer-facing (input, opts) => Promise<{ data, meta }>.
const { data, meta } = await createEvent(
  {
    calendarId: "primary",
    summary: "Sync with Sam",
    start: {
      dateTime: "2026-06-18T15:00:00-07:00",
      timeZone: "America/Los_Angeles",
    },
    end: {
      dateTime: "2026-06-18T15:30:00-07:00",
      timeZone: "America/Los_Angeles",
    },
  },
  { connection: "env:GOOGLE_CALENDAR_ACCESS_TOKEN" },
);
// data is the created Event (id, htmlLink, start, end, …); meta.outputDataValidation reports
// what validation did. Pass { skipOutputDataValidation: true } to receive the raw API output.
```

## MCP Server

Add one stanza to any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) to auto-discover the tools over stdio:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "google-calendar": {
      "command": "npx",
      "args": ["@zapier/google-calendar-connector", "mcp"],
      "env": {
        "GOOGLE_CALENDAR_ZAPIER_CONNECTION_ID": "<connection-id>"
      }
    }
  }
}
```

Swap `GOOGLE_CALENDAR_ZAPIER_CONNECTION_ID` for `GOOGLE_CALENDAR_ACCESS_TOKEN` if you don't have a Zapier account.

## When to use this

- Scheduling, finding, rescheduling, moving, or cancelling Google Calendar events from an agent.
- Checking when someone is busy or free across one or more calendars before proposing a time.
- Listing or creating calendars, reading a calendar's timezone, or managing who a calendar is shared with.

## When NOT to use this

- Real-time event triggers / push notifications (new-event, event-updated) — this connector is request/response only; use a Zapier trigger or the Calendar watch API.
- Renaming or deleting calendars, clearing all events at once, or importing externally-originated events — these are intentionally out of scope.
- Gmail, Google Drive, or other Google products — use their dedicated connectors.

## Links

- [Google Calendar API v3 reference](https://developers.google.com/workspace/calendar/api/v3/reference) — vendor API docs
- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Source](https://github.com/zapier/connectors/tree/main/apps/google-calendar)
