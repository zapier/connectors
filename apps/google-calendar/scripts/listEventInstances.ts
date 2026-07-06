#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  boundsNeedZone,
  EventSchema,
  expandBounds,
  isTimeBound,
  resolveCalendarTimeZone,
  throwForGoogleCalendar,
  TIME_BOUND_MESSAGE,
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
        "The recurring master event id (from listEvents or getEvent) whose occurrences to expand.",
      ),
    timeMin: z
      .string()
      .refine(isTimeBound, { message: TIME_BOUND_MESSAGE })
      .describe(
        "Lower bound (exclusive) for an instance's end time. RFC3339 with offset (e.g. 2026-06-16T00:00:00Z), OR a bare date YYYY-MM-DD (e.g. 2026-07-03) read as start-of-day in the calendar's own timezone — no separate getCalendar lookup needed.",
      )
      .optional(),
    timeMax: z
      .string()
      .refine(isTimeBound, { message: TIME_BOUND_MESSAGE })
      .describe(
        "Upper bound (exclusive) for an instance's start time. RFC3339 with offset, OR a bare date YYYY-MM-DD read as start-of-day in the calendar's timezone; must be greater than timeMin. For a single day, pass the next day as timeMax (e.g. timeMin=2026-07-03, timeMax=2026-07-04).",
      )
      .optional(),
    maxResults: z
      .number()
      .int()
      .gte(1)
      .lte(2500)
      .describe(
        "Max instances to return per page. Defaults to 10 when omitted; pass a value when you need a specific number of results.",
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
    instances: z.array(EventSchema),
    next_page_token: z
      .string()
      .describe(
        "Cursor for the next page; absent when there are no more results.",
      )
      .optional(),
  })
  .describe("A page of recurring-event instances.");

const definition = defineTool({
  name: "listEventInstances",
  title: "List Event Instances",
  description:
    "List the individual occurrences (instances) of a recurring event. Take a target instance's id and updateEvent it to edit a single occurrence — never patch the recurring master. Resolve the master eventId via listEvents.",
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
    // Expand any bare YYYY-MM-DD bound to start-of-day in the calendar's own
    // timezone, fetched once and only when a bare date is passed.
    let { timeMin, timeMax } = input;
    if (boundsNeedZone(timeMin, timeMax)) {
      const timeZone = await resolveCalendarTimeZone(
        ctx.fetch,
        input.calendarId,
        "listEventInstances",
      );
      ({ timeMin, timeMax } = expandBounds(timeMin, timeMax, timeZone));
    }

    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events/${encodeURIComponent(input.eventId)}/instances`,
    );
    if (timeMin !== undefined) url.searchParams.set("timeMin", timeMin);
    if (timeMax !== undefined) url.searchParams.set("timeMax", timeMax);
    url.searchParams.set("maxResults", String(input.maxResults ?? 10));
    if (input.pageToken !== undefined)
      url.searchParams.set("pageToken", input.pageToken);

    const res = await ctx.fetch(url.toString(), { method: "GET" });
    await throwForGoogleCalendar(res, "listEventInstances");
    const payload = (await res.json()) as {
      items?: unknown;
      nextPageToken?: string;
    };
    return {
      instances: payload.items ?? [],
      next_page_token: payload.nextPageToken,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
