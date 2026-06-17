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
        'Target calendar. "primary" for the connected user\'s main calendar, or an id from listCalendars (often an email or ...@group.calendar.google.com).',
      ),
    text: z
      .string()
      .describe(
        'Natural-language event phrase Google parses into an event, e.g. "Lunch with Sam tomorrow 12pm".',
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
  name: "quickAddEvent",
  title: "Quick Add Event",
  description:
    'Create an event from a natural-language phrase (e.g. "Lunch with Sam tomorrow 12pm"). LOSSY — parses title + date/time only and silently drops attendees, recurrence, conferencing, and location; use createEvent for any of those.',
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
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events/quickAdd`,
    );
    url.searchParams.set("text", input.text);
    url.searchParams.set("sendUpdates", input.sendUpdates);

    const res = await ctx.fetch(url.toString(), { method: "POST" });
    await throwForGoogleCalendar(res, "quickAddEvent");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
