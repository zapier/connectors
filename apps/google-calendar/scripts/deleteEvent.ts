#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwForGoogleCalendar } from "../lib/google-calendar.ts";

const inputSchema = z
  .object({
    calendarId: z
      .string()
      .describe(
        'Calendar holding the event. "primary" or an id from listCalendars.',
      ),
    eventId: z
      .string()
      .describe(
        "Event id from listEvents or getEvent. For a recurring occurrence, use the instance id from listEventInstances.",
      ),
    sendUpdates: z
      .enum(["all", "externalOnly", "none"])
      .describe(
        'Who to notify of the cancellation. Defaults to "all". Override with "externalOnly" or "none" to suppress notices.',
      )
      .default("all"),
  })
  .strict();

const outputSchema = z
  .object({ success: z.literal(true) })
  .describe(
    "Deletion result. The API returns an empty body; success is synthesized.",
  );

const definition = defineTool({
  name: "deleteEvent",
  title: "Delete Event",
  description:
    "Delete an event from a calendar. Idempotent — an already-deleted/cancelled event still reports success. Set sendUpdates to control cancellation notices.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-calendar",
  run: async (input, ctx) => {
    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events/${encodeURIComponent(input.eventId)}`,
    );
    url.searchParams.set("sendUpdates", input.sendUpdates);

    const res = await ctx.fetch(url.toString(), { method: "DELETE" });
    // Soft-success: 410 Gone means the event was already deleted/cancelled —
    // the postcondition (event no longer present) holds, so report success.
    // A 404 (calendar/event id never existed) is surfaced as an error.
    if (res.status === 410) return { success: true as const };
    await throwForGoogleCalendar(res, "deleteEvent");
    return { success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
