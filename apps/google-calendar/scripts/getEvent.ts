#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { EventSchema, throwForGoogleCalendar } from "../lib/google-calendar.ts";

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
        "Event id from listEvents or getEvent. For a recurring occurrence, use the instance id from listEventInstances.",
      ),
  })
  .strict();

const definition = defineTool({
  name: "getEvent",
  title: "Get Event",
  description:
    'Retrieve a single event by id. Use after createEvent/updateEvent with add_google_meet to read the resolved Meet link once conferenceData.createRequest.status.statusCode === "success". Resolve eventId via listEvents (or listEventInstances for a recurring occurrence).',
  inputSchema,
  outputSchema: EventSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-calendar",
  run: async (input, ctx) => {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events/${encodeURIComponent(input.eventId)}`;
    const res = await ctx.fetch(url, { method: "GET" });
    await throwForGoogleCalendar(res, "getEvent");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
