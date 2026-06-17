#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwForGoogleCalendar } from "../lib/google-calendar.ts";

const inputSchema = z
  .object({
    summary: z.string().describe("The calendar's name/title."),
    description: z
      .string()
      .describe("Optional description of the calendar.")
      .optional(),
    timeZone: z
      .string()
      .describe("IANA timezone id (e.g. America/Los_Angeles).")
      .optional(),
    location: z
      .string()
      .describe("Optional geographic location, free text.")
      .optional(),
  })
  .strict();

// Keep this schema field-for-field identical to getCalendar.ts's CalendarSchema.
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
            "Conference solution types this calendar supports (e.g. hangoutsMeet).",
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
  name: "createCalendar",
  title: "Create Calendar",
  description:
    "Create a new secondary calendar owned by the connected user. The returned id is the handle for createEvent, createAclRule, etc.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "google-calendar",
  run: async (input, ctx) => {
    const url = `https://www.googleapis.com/calendar/v3/calendars`;
    const body: Record<string, unknown> = {};
    if (input.summary !== undefined) body["summary"] = input.summary;
    if (input.description !== undefined)
      body["description"] = input.description;
    if (input.timeZone !== undefined) body["timeZone"] = input.timeZone;
    if (input.location !== undefined) body["location"] = input.location;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwForGoogleCalendar(res, "createCalendar");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
