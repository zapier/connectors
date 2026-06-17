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
        'Target calendar. "primary" for the connected user\'s main calendar, or an id from listCalendars (often an email or ...@group.calendar.google.com).',
      ),
    start: EventDateTimeInput.describe(
      "Event start. All-day = { date } (YYYY-MM-DD); timed = { dateTime, timeZone }. Recurring events require timeZone.",
    ),
    end: EventDateTimeInput.describe(
      "Event end. For all-day events end.date is EXCLUSIVE — a single all-day event has end.date = start.date + 1.",
    ),
    summary: z.string().describe("Event title.").optional(),
    description: z
      .string()
      .describe(
        "Event details. A limited HTML subset is accepted (b, i, a, ul/li); plain text is safest.",
      )
      .optional(),
    location: z.string().describe("Free-text location.").optional(),
    attendees: z
      .array(AttendeeInput)
      .describe("Guests to invite. Pair with sendUpdates so they are notified.")
      .optional(),
    recurrence: z
      .array(z.string())
      .describe(
        'RFC5545 lines, e.g. ["RRULE:FREQ=WEEKLY;BYDAY=MO"]. No DTSTART (derived from start). Requires start.timeZone; UNTIL must be UTC (Z) for timed events.',
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
    eventType: z
      .enum(["default", "outOfOffice", "focusTime", "workingLocation"])
      .describe(
        "Event type. birthday and fromGmail are NOT creatable. outOfOffice/focusTime need a timed start/end and transparency=opaque.",
      )
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
  name: "createEvent",
  title: "Create Event",
  description:
    "Create a calendar event — timed or all-day, optionally recurring, with attendees, reminders, color, and Google Meet. Resolve calendarId via listCalendars first; for a Meet link set add_google_meet, then read the resolved link with getEvent.",
  inputSchema,
  outputSchema: EventSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "google-calendar",
  run: async (input, ctx) => {
    const { calendarId, sendUpdates, add_google_meet, ...event } = input;
    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    );
    url.searchParams.set("sendUpdates", sendUpdates);

    const body: Record<string, unknown> = { ...event };
    if (add_google_meet) {
      // Google Meet is created asynchronously: attach a createRequest with a
      // fresh requestId + the hangoutsMeet solution, and flip conferenceDataVersion=1
      // (omitting it silently drops the conference). The insert response carries
      // status "pending"; the agent calls getEvent to read the resolved link.
      body["conferenceData"] = {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
      url.searchParams.set("conferenceDataVersion", "1");
    }

    const res = await ctx.fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwForGoogleCalendar(res, "createEvent");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
