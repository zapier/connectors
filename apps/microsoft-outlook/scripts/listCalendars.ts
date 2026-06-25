#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  buildListQuery,
  GRAPH_BASE,
  mailboxRoot,
  outlookFetch,
  toListResult,
} from "../lib/graph.ts";

const inputSchema = z
  .object({
    mailbox: z
      .string()
      .describe(
        "Shared-mailbox address (UPN/email) to read instead of your own, e.g. team@contoso.com. Requires shared-mailbox delegation. Omit for your own mailbox.",
      )
      .optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Calendars per page. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
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
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      isDefaultCalendar: z.boolean().optional(),
      canEdit: z.boolean().optional(),
    }),
  ),
  next_cursor: z
    .string()
    .describe("Pass as cursor to fetch the next page. Absent on the last page.")
    .optional(),
});

const definition = defineTool({
  name: "listCalendars",
  title: "List Calendars",
  description:
    "List the available calendars in a mailbox. The entry point for resolving a calendarId to pass to the event tools (listEvents, listCalendarView, createEvent, ...); omit calendarId on those tools to use the default calendar.",
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
      const query = buildListQuery({ limit: input.limit ?? 20 });
      url = `${GRAPH_BASE}${mailboxRoot(input.mailbox)}/calendars${query}`;
    }
    const res = await outlookFetch(ctx.fetch, "listCalendars", url);
    return toListResult(await res.json());
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
