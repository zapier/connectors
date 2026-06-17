#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwForGoogleCalendar } from "../lib/google-calendar.ts";

const CalendarListEntrySchema = z
  .object({
    id: z.string().describe("Calendar id (use as calendarId)."),
    summary: z.string().describe("Calendar name.").optional(),
    description: z.string().optional(),
    timeZone: z.string().describe("The calendar's IANA timezone.").optional(),
    accessRole: z
      .enum(["freeBusyReader", "reader", "writer", "owner"])
      .describe(
        "The user's role on this calendar — reader, writer, owner, or freeBusyReader. Gates writes/sharing.",
      )
      .optional(),
    primary: z
      .boolean()
      .describe("Whether this is the user's primary calendar.")
      .optional(),
    colorId: z.string().optional(),
    backgroundColor: z.string().optional(),
    selected: z.boolean().optional(),
    hidden: z.boolean().optional(),
    defaultReminders: z
      .array(
        z.object({
          method: z.string().optional(),
          minutes: z.number().int().optional(),
        }),
      )
      .describe("The calendar's default reminders, applied to new events.")
      .optional(),
    conferenceProperties: z
      .object({
        allowedConferenceSolutionTypes: z.array(z.string()).optional(),
      })
      .optional(),
  })
  .describe(
    "A calendar as it appears on the user's list, with the user's access role.",
  );

const inputSchema = z
  .object({
    minAccessRole: z
      .enum(["freeBusyReader", "reader", "writer", "owner"])
      .describe("Only return calendars where the user has at least this role.")
      .optional(),
    showHidden: z
      .boolean()
      .describe("Include calendars hidden from the user's list.")
      .optional(),
    showDeleted: z
      .boolean()
      .describe("Include deleted calendar list entries.")
      .optional(),
    maxResults: z
      .number()
      .int()
      .gte(1)
      .lte(250)
      .describe(
        "Max calendars to return per page. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    pageToken: z
      .string()
      .describe(
        "Page cursor from a previous response's next_page_token. Omit for the first page.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  calendars: z.array(CalendarListEntrySchema),
  next_page_token: z.string().optional(),
});

const definition = defineTool({
  name: "listCalendars",
  title: "List Calendars",
  description:
    "List the calendars on the account with id, access role, primary flag, and timezone. The primary resolver for any calendarId; filter minAccessRole=writer to find writable calendars.",
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
    const url = new URL(
      `https://www.googleapis.com/calendar/v3/users/me/calendarList`,
    );
    if (input.minAccessRole !== undefined) {
      url.searchParams.set("minAccessRole", String(input.minAccessRole));
    }
    if (input.showHidden !== undefined) {
      url.searchParams.set("showHidden", String(input.showHidden));
    }
    if (input.showDeleted !== undefined) {
      url.searchParams.set("showDeleted", String(input.showDeleted));
    }
    url.searchParams.set("maxResults", String(input.maxResults ?? 20));
    if (input.pageToken !== undefined) {
      url.searchParams.set("pageToken", String(input.pageToken));
    }
    const res = await ctx.fetch(url.toString(), { method: "GET" });
    await throwForGoogleCalendar(res, "listCalendars");
    const payload = (await res.json()) as {
      items?: unknown;
      nextPageToken?: string;
    };
    return {
      calendars: payload.items ?? [],
      next_page_token: payload.nextPageToken,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
