#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  AttendeeInput,
  EventDateTimeInput,
  EventSchema,
  RemindersInput,
  throwForGoogleCalendar,
} from "../lib/google-calendar.ts";

const inputSchema = z
  .object({
    calendarId: z
      .string()
      .describe(
        'Calendar holding the event. "primary" for the connected user\'s main calendar, or an id from listCalendars (often an email or ...@group.calendar.google.com).',
      ),
    eventId: z
      .string()
      .describe(
        "Event id from listEvents or getEvent. To edit a single occurrence of a recurring event, pass the instance id from listEventInstances — never the master id.",
      ),
    summary: z.string().describe("Event title.").optional(),
    description: z
      .string()
      .describe(
        "Event details. A limited HTML subset is accepted (b, i, a, ul/li); plain text is safest.",
      )
      .optional(),
    location: z.string().describe("Free-text location.").optional(),
    start: EventDateTimeInput.describe(
      "New event start. All-day = { date } (YYYY-MM-DD); timed = { dateTime, timeZone }. Recurring events require timeZone.",
    ).optional(),
    end: EventDateTimeInput.describe(
      "New event end. For all-day events end.date is EXCLUSIVE — a single all-day event has end.date = start.date + 1.",
    ).optional(),
    recurrence: z
      .array(z.string())
      .describe(
        'RFC5545 lines, e.g. ["RRULE:FREQ=WEEKLY;BYDAY=MO"]. REPLACES the existing recurrence wholesale. No DTSTART (derived from start); requires start.timeZone.',
      )
      .optional(),
    attendees: z
      .array(AttendeeInput)
      .describe(
        "REPLACES the full attendee list — send the complete desired roster. To add a guest without removing others, use addEventAttendees. Pair with sendUpdates so guests are notified.",
      )
      .optional(),
    reminders: RemindersInput.optional(),
    colorId: z
      .string()
      .describe(
        "Event color as a palette index 1-11 (NOT a hex value). Resolve indexes via getColors.",
      )
      .optional(),
    visibility: z
      .enum(["default", "public", "private", "confidential"])
      .describe("Event visibility.")
      .optional(),
    transparency: z
      .enum(["opaque", "transparent"])
      .describe("opaque = shows as busy; transparent = shows as free.")
      .optional(),
    guestsCanModify: z
      .boolean()
      .describe("Whether guests can edit the event.")
      .optional(),
    guestsCanInviteOthers: z
      .boolean()
      .describe("Whether guests can invite others (default true).")
      .optional(),
    guestsCanSeeOtherGuests: z
      .boolean()
      .describe("Whether guests can see the attendee list (default true).")
      .optional(),
    add_google_meet: z
      .boolean()
      .describe(
        "Attach a Google Meet conference to the event. The link resolves asynchronously — the response carries conferenceData.createRequest.status (pending); call getEvent to read the resolved link once it is success.",
      )
      .optional(),
    sendUpdates: z
      .enum(["all", "externalOnly", "none"])
      .describe(
        'Who to notify. Defaults to "all" (every guest notified) so invitees are never silently dropped. Override with "externalOnly" (non-Google guests only) or "none" (stay silent).',
      )
      .default("all"),
  })
  .strict();

const definition = defineTool({
  name: "updateEvent",
  title: "Update Event",
  description:
    "Update fields on an existing event (partial — only the fields you send change). Array fields (attendees, recurrence, reminders.overrides) REPLACE the existing array — to add a guest without removing others use addEventAttendees. To edit one occurrence of a recurring event, patch the instance id from listEventInstances, not the master.",
  inputSchema,
  outputSchema: EventSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-calendar",
  run: async (input, ctx) => {
    const { calendarId, eventId, sendUpdates, add_google_meet, ...event } =
      input;
    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    );
    url.searchParams.set("sendUpdates", sendUpdates);

    // Only send the patch fields the caller actually provided — events.patch
    // erases nothing it doesn't see, but array fields it DOES see replace
    // wholesale (§3c), so an undefined field must stay out of the body.
    const body: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(event)) {
      if (value !== undefined) body[key] = value;
    }
    if (add_google_meet) {
      // Google Meet is created asynchronously: attach a createRequest with a
      // fresh requestId + the hangoutsMeet solution, and flip conferenceDataVersion=1
      // (omitting it silently drops the conference). The response carries status
      // "pending"; the agent calls getEvent to read the resolved link.
      body["conferenceData"] = {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
      url.searchParams.set("conferenceDataVersion", "1");
    }

    const res = await ctx.fetch(url.toString(), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwForGoogleCalendar(res, "updateEvent");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
