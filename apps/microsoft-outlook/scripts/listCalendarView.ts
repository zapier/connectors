#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  calendarRoot,
  GRAPH_BASE,
  outlookFetch,
  toListResult,
} from "../lib/graph.ts";
import { eventListItemSchema } from "../lib/schemas.ts";

const inputSchema = z
  .object({
    startDateTime: z
      .string()
      .describe(
        'Window start, ISO 8601 (e.g. "2026-07-01T00:00:00"). Interpreted as UTC unless it carries an offset.',
      ),
    endDateTime: z
      .string()
      .describe(
        "Window end, ISO 8601. Interpreted as UTC unless it carries an offset.",
      ),
    mailbox: z
      .string()
      .describe(
        "Shared-mailbox address (UPN/email) to read instead of your own, e.g. team@contoso.com. Requires shared-mailbox delegation. Omit for your own mailbox.",
      )
      .optional(),
    calendarId: z
      .string()
      .describe(
        "Target a specific calendar (id from listCalendars). Omit to use the default calendar.",
      )
      .optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Events per page. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    cursor: z
      .string()
      .describe(
        "Pagination cursor from a previous response's next_cursor. Omit for the first page.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  items: z.array(eventListItemSchema),
  next_cursor: z
    .string()
    .describe("Pass as cursor to fetch the next page. Absent on the last page.")
    .optional(),
});

const definition = defineTool({
  name: "listCalendarView",
  title: "List Calendar View",
  description:
    'The primary "what\'s on my calendar" tool: list everything occurring between startDateTime and endDateTime, expanding recurring series into their individual occurrences. Targets the default calendar unless calendarId is set.',
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-outlook",
  run: async (input, ctx) => {
    // `@odata.nextLink` is an opaque full URL — when paging, fetch it verbatim
    // and skip rebuilding the path/query.
    let url: string;
    if (input.cursor !== undefined) {
      url = input.cursor;
    } else {
      // calendarView takes literal startDateTime/endDateTime params (not
      // $-prefixed), plus the standard $top page size.
      const sp = new URLSearchParams();
      sp.set("startDateTime", input.startDateTime);
      sp.set("endDateTime", input.endDateTime);
      sp.set("$top", String(input.limit ?? 20));
      url = `${GRAPH_BASE}${calendarRoot(input.mailbox, input.calendarId)}/calendarView?${sp.toString()}`;
    }
    const res = await outlookFetch(ctx.fetch, "listCalendarView", url);
    return toListResult(await res.json());
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
