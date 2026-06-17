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
        'Source calendar holding the event. "primary" for the connected user\'s main calendar, or an id from listCalendars.',
      ),
    eventId: z
      .string()
      .describe("Event id (from listEvents or getEvent) to move."),
    destination: z
      .string()
      .describe(
        "Destination calendar id from listCalendars. The event moves out of the source calendarId into this one.",
      ),
    sendUpdates: z
      .enum(["all", "externalOnly", "none"])
      .describe(
        'Who to notify. Defaults to "all" (every guest notified) so invitees are never silently dropped. Override with "externalOnly" (non-Google guests only) or "none" (stay silent).',
      )
      .default("all"),
  })
  .strict();

const definition = defineTool({
  name: "moveEvent",
  title: "Move Event",
  description:
    "Move an event from one calendar to another. Only default events are movable (not birthday/focusTime/outOfOffice/workingLocation). Needs write access to both calendars — resolve both ids via listCalendars.",
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
    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events/${encodeURIComponent(input.eventId)}/move`,
    );
    url.searchParams.set("destination", input.destination);
    url.searchParams.set("sendUpdates", input.sendUpdates);

    const res = await ctx.fetch(url.toString(), { method: "POST" });
    await throwForGoogleCalendar(res, "moveEvent");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
