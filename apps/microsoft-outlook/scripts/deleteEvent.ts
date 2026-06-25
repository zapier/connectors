#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { calendarRoot, GRAPH_BASE, outlookFetch } from "../lib/graph.ts";

const inputSchema = z
  .object({
    eventId: z
      .string()
      .describe(
        "Opaque event id from listEvents, listCalendarView, or getEvent.",
      ),
    mailbox: z
      .string()
      .describe(
        "Shared-mailbox address (UPN/email) holding the event instead of your own. Requires shared-mailbox delegation. Omit for your own mailbox.",
      )
      .optional(),
    calendarId: z
      .string()
      .describe(
        "Target a specific calendar (id from listCalendars). Omit to use the default calendar.",
      )
      .optional(),
  })
  .strict();

// Graph's DELETE /events/{id} returns 204 with no body — run() synthesizes a
// success result.
const outputSchema = z.object({
  success: z.literal(true),
});

const definition = defineTool({
  name: "deleteEvent",
  title: "Delete Event",
  description:
    "Delete (cancel) a calendar event. For events you organize, attendees are notified of the cancellation — this is not trivially reversible.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-outlook",
  run: async (input, ctx) => {
    const url = `${GRAPH_BASE}${calendarRoot(input.mailbox, input.calendarId)}/events/${encodeURIComponent(
      input.eventId,
    )}`;
    await outlookFetch(ctx.fetch, "deleteEvent", url, { method: "DELETE" });
    return { success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
