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
        'Calendar id. "primary" for the connected user\'s main calendar, or an id from listCalendars (often an email or ...@group.calendar.google.com).',
      ),
  })
  .strict();

// Keep this schema field-for-field identical to createCalendar.ts's CalendarSchema.
const CalendarSchema = z
  .object({
    id: z.string(),
    summary: z.string().describe("Calendar name.").optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    timeZone: z
      .string()
      .describe(
        "The calendar's IANA timezone (the user's default timezone for the \"primary\" calendar).",
      )
      .optional(),
    conferenceProperties: z
      .object({
        allowedConferenceSolutionTypes: z
          .array(z.string())
          .describe(
            "Conference types this calendar supports (e.g. hangoutsMeet). Empty means Meet links can't be created here.",
          )
          .optional(),
      })
      .optional(),
    etag: z.string().optional(),
    kind: z.string().optional(),
  })
  .describe("A calendar resource.");

const outputSchema = CalendarSchema;

const definition = defineTool({
  name: "getCalendar",
  title: "Get Calendar",
  description:
    "Get a calendar's metadata — timezone, description, and conference support. getCalendar(\"primary\") returns the user's default timezone.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-calendar",
  run: async (input, ctx) => {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}`;
    const res = await ctx.fetch(url, { method: "GET" });
    await throwForGoogleCalendar(res, "getCalendar");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
