#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { calendarRoot, GRAPH_BASE, outlookFetch } from "../lib/graph.ts";
import { eventSchema, outgoingEventSchema } from "../lib/schemas.ts";

const inputSchema = z
  .object({
    ...outgoingEventSchema.shape,
    mailbox: z
      .string()
      .describe(
        "Shared-mailbox address (UPN/email) to create the event in instead of your own. Requires shared-mailbox delegation. Omit for your own mailbox.",
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
  name: "createEvent",
  title: "Create Event",
  description:
    "Create a calendar event. Targets the default calendar unless calendarId is set. start and end are { dateTime, timeZone } objects where dateTime is a naive local timestamp (no trailing Z or offset). For an all-day event set isAllDay with start/end at midnight in the same time zone (end is midnight of the day AFTER the last day). Set isOnlineMeeting to add a Teams online meeting.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "microsoft-outlook",
  run: async (input, ctx) => {
    const { mailbox, calendarId, ...event } = input;
    const url = `${GRAPH_BASE}${calendarRoot(mailbox, calendarId)}/events`;
    const res = await outlookFetch(ctx.fetch, "createEvent", url, {
      method: "POST",
      body: JSON.stringify(event),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
