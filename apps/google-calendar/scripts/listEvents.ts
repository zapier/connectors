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
        'Calendar to search. "primary" for the connected user\'s main calendar, or an id from listCalendars (often an email or ...@group.calendar.google.com).',
      ),
    timeMin: z
      .string()
      .datetime({ offset: true })
      .describe(
        "Lower bound (exclusive) for an event's end time. RFC3339 with offset, e.g. 2026-06-16T00:00:00Z — a bare timestamp is rejected.",
      )
      .optional(),
    timeMax: z
      .string()
      .datetime({ offset: true })
      .describe(
        "Upper bound (exclusive) for an event's start time. RFC3339 with offset; must be greater than timeMin.",
      )
      .optional(),
    q: z
      .string()
      .describe(
        "Free-text search over summary, description, location, and attendee/organizer name and email.",
      )
      .optional(),
    singleEvents: z
      .boolean()
      .describe(
        "Expand recurring events into individual instances. Required true to get occurrences (false returns the recurring master only). Required true for orderBy=startTime.",
      )
      .optional(),
    orderBy: z
      .enum(["startTime", "updated"])
      .describe(
        "Sort order. startTime requires singleEvents=true; updated works either way.",
      )
      .optional(),
    eventTypes: z
      .array(
        z.enum([
          "default",
          "birthday",
          "focusTime",
          "fromGmail",
          "outOfOffice",
          "workingLocation",
        ]),
      )
      .describe("Filter to these event types.")
      .optional(),
    showDeleted: z
      .boolean()
      .describe(
        'Include cancelled (deleted) events, which carry status "cancelled".',
      )
      .optional(),
    maxResults: z
      .number()
      .int()
      .gte(1)
      .lte(2500)
      .describe(
        "Max events to return per page. Defaults to 10 when omitted; pass a value when you need a specific number of results.",
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

const outputSchema = z
  .object({
    events: z.array(EventSchema),
    next_page_token: z
      .string()
      .describe(
        "Cursor for the next page; absent when there are no more results.",
      )
      .optional(),
  })
  .describe("A page of events.");

const definition = defineTool({
  name: "listEvents",
  title: "List Events",
  description:
    "List or search events on a calendar within a time window, by text (q), or by event type. Pass singleEvents=true to expand recurring events into individual occurrences. Resolve calendarId via listCalendars.",
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
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events`,
    );
    if (input.timeMin !== undefined)
      url.searchParams.set("timeMin", input.timeMin);
    if (input.timeMax !== undefined)
      url.searchParams.set("timeMax", input.timeMax);
    if (input.q !== undefined) url.searchParams.set("q", input.q);
    if (input.singleEvents !== undefined)
      url.searchParams.set("singleEvents", String(input.singleEvents));
    if (input.orderBy !== undefined)
      url.searchParams.set("orderBy", input.orderBy);
    // eventTypes is a repeated query param, not a comma-joined string.
    if (input.eventTypes !== undefined) {
      for (const t of input.eventTypes)
        url.searchParams.append("eventTypes", t);
    }
    if (input.showDeleted !== undefined)
      url.searchParams.set("showDeleted", String(input.showDeleted));
    url.searchParams.set("maxResults", String(input.maxResults ?? 10));
    if (input.pageToken !== undefined)
      url.searchParams.set("pageToken", input.pageToken);

    const res = await ctx.fetch(url.toString(), { method: "GET" });
    await throwForGoogleCalendar(res, "listEvents");
    const payload = (await res.json()) as {
      items?: unknown;
      nextPageToken?: string;
    };
    return {
      events: payload.items ?? [],
      next_page_token: payload.nextPageToken,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
