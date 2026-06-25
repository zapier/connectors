#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  calendarRoot,
  GRAPH_BASE,
  outlookFetch,
  parseGraphResponse,
} from "../lib/graph.ts";
import { eventSchema } from "../lib/schemas.ts";

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
        "Shared-mailbox address (UPN/email) to read from instead of your own. Requires shared-mailbox delegation. Omit for your own mailbox.",
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

const outputSchema = eventSchema;

const definition = defineTool({
  name: "getEvent",
  title: "Get Event",
  description:
    "Retrieve a single calendar event by id, including attendees, body, and online-meeting details. Resolve the id via listEvents or listCalendarView first. Use this to read the current state before updateEvent (read-modify-write — e.g. fetch the attendees, append, then update).",
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
    const url = `${GRAPH_BASE}${calendarRoot(input.mailbox, input.calendarId)}/events/${encodeURIComponent(
      input.eventId,
    )}`;
    const res = await outlookFetch(ctx.fetch, "getEvent", url);
    return parseGraphResponse(res);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
