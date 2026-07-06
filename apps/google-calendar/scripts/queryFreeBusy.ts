#!/usr/bin/env node
// Authored by the implementation agent: codegen only scaffolds single-HTTP-call
// ops with pass-through shapes, but freeBusy needs input/output transforms —
// the agent-friendly `calendar_ids` string array is mapped to the wire's
// `items: [{ id }]` request shape, and the response's per-calendar busy/error
// map is surfaced as-is (per-calendar errors are returned, not thrown). Those
// reshapes don't fit the codegen single-call template.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  boundsNeedZone,
  isPlainDate,
  isTimeBound,
  plainDateToStartOfDay,
  resolveCalendarTimeZone,
  throwForGoogleCalendar,
  TIME_BOUND_MESSAGE,
} from "../lib/google-calendar.ts";

const inputSchema = z
  .object({
    timeMin: z
      .string()
      .refine(isTimeBound, { message: TIME_BOUND_MESSAGE })
      .describe(
        'Start of the query window. RFC3339 with offset (e.g. 2026-06-16T00:00:00Z), OR a bare date YYYY-MM-DD read as start-of-day in the timeZone you pass (or the first calendar\'s timezone) — so you can ask for "tomorrow" without a separate getCalendar lookup.',
      ),
    timeMax: z
      .string()
      .refine(isTimeBound, { message: TIME_BOUND_MESSAGE })
      .describe(
        "End of the query window. RFC3339 with offset, OR a bare date YYYY-MM-DD read as start-of-day in the same timezone; must be greater than timeMin. For a single day, pass the next day as timeMax.",
      ),
    calendar_ids: z
      .array(z.string())
      .default(["primary"])
      .describe('Calendar ids to check. Defaults to ["primary"].'),
    timeZone: z
      .string()
      .describe(
        "IANA timezone id for the response, e.g. America/Los_Angeles. Defaults to UTC. Also used to interpret a bare-date timeMin/timeMax.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z
  .object({
    calendars: z.record(
      z.string(),
      z.object({
        busy: z.array(z.object({ start: z.string(), end: z.string() })),
        errors: z
          .array(
            z.object({
              domain: z.string().optional(),
              reason: z.string().optional(),
            }),
          )
          .optional(),
      }),
    ),
  })
  .describe(
    "Busy blocks keyed by calendar id. A per-calendar errors entry (e.g. notFound) is surfaced, not thrown.",
  );

const definition = defineTool({
  name: "queryFreeBusy",
  title: "Query Free/Busy",
  description:
    "Return busy time blocks across one or more calendars in a time window — for scheduling/availability checks. A bad calendar id surfaces as a per-calendar error rather than failing the whole query.",
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
    // Expand any bare YYYY-MM-DD bound to start-of-day. The frame is the caller's
    // timeZone when given, otherwise the first calendar's own zone (fetched once,
    // and only when a bare date is actually passed). Bounds are required here, so
    // they stay non-optional through the expansion.
    let { timeMin, timeMax } = input;
    if (boundsNeedZone(timeMin, timeMax)) {
      const timeZone =
        input.timeZone ??
        (await resolveCalendarTimeZone(
          ctx.fetch,
          input.calendar_ids[0] ?? "primary",
          "queryFreeBusy",
        ));
      if (isPlainDate(timeMin))
        timeMin = plainDateToStartOfDay(timeMin, timeZone);
      if (isPlainDate(timeMax))
        timeMax = plainDateToStartOfDay(timeMax, timeZone);
    }

    // Map the agent-friendly `calendar_ids` array into the wire's `items`
    // shape; only include timeZone when the caller provided one.
    const body: Record<string, unknown> = {
      timeMin,
      timeMax,
      items: input.calendar_ids.map((id) => ({ id })),
    };
    if (input.timeZone !== undefined) body["timeZone"] = input.timeZone;

    const res = await ctx.fetch(
      "https://www.googleapis.com/calendar/v3/freeBusy",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    await throwForGoogleCalendar(res, "queryFreeBusy");
    // The wire response is already { calendars: { <id>: { busy, errors? } }, ... };
    // extra top-level fields (kind, timeMin, timeMax) are dropped on output parse.
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
