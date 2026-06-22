#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  buildListQuery,
  calendarRoot,
  GRAPH_BASE,
  outlookFetch,
  toListResult,
} from "../lib/graph.ts";
import { eventListItemSchema } from "../lib/schemas.ts";

const inputSchema = z
  .object({
    filter: z
      .string()
      .describe(
        "OData $filter predicate for exact matches, e.g. \"subject eq 'Standup'\" or \"showAs eq 'busy'\". Omit to list all events.",
      )
      .optional(),
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
  name: "listEvents",
  title: "List Events",
  description:
    "List a calendar's events: single events plus recurring SERIES MASTERS (the recurrence definition, not expanded occurrences). Use filter for exact predicates. To see what actually occurs within a date range — including each occurrence of a recurring series — use listCalendarView instead.",
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
      const query = buildListQuery({
        limit: input.limit ?? 20,
        filter: input.filter,
      });
      url = `${GRAPH_BASE}${calendarRoot(input.mailbox, input.calendarId)}/events${query}`;
    }
    const res = await outlookFetch(ctx.fetch, "listEvents", url);
    return toListResult(await res.json());
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
