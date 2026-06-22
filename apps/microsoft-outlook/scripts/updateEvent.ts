#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { calendarRoot, GRAPH_BASE, outlookFetch } from "../lib/graph.ts";
import { eventSchema, outgoingEventSchema } from "../lib/schemas.ts";

const inputSchema = z
  .object({
    eventId: z
      .string()
      .describe(
        "Opaque event id from listEvents, listCalendarView, or getEvent.",
      ),
    ...outgoingEventSchema.partial().shape,
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

const outputSchema = eventSchema;

const definition = defineTool({
  name: "updateEvent",
  title: "Update Event",
  description:
    "Update a calendar event — change subject, time, location, body, attendees, or categories. Set only the fields you want to change. The attendees array REPLACES the existing list, so read the current attendees via getEvent, append, then update.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-outlook",
  run: async (input, ctx) => {
    const { eventId, mailbox, calendarId, ...patch } = input;
    const url = `${GRAPH_BASE}${calendarRoot(mailbox, calendarId)}/events/${encodeURIComponent(
      eventId,
    )}`;
    // JSON.stringify drops undefined keys, so only the provided fields are sent.
    const res = await outlookFetch(ctx.fetch, "updateEvent", url, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
