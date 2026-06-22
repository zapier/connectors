#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({
    subject: z.string().describe("Activity subject/title."),
    type: z
      .string()
      .describe(
        "Activity type key (not the display label). From listActivityTypes.",
      )
      .optional(),
    due_date: z.string().date().describe("Due date, YYYY-MM-DD.").optional(),
    due_time: z
      .string()
      .describe("Due time, 24h HH:MM (e.g. 14:30). Not HH:MM:SS.")
      .optional(),
    duration: z
      .string()
      .describe("Activity duration, same HH:MM clock format as due_time.")
      .optional(),
    deal_id: z
      .number()
      .int()
      .describe("Link to a deal. From searchDeals or listDeals.")
      .optional(),
    person_id: z
      .number()
      .int()
      .describe("Link to a person. From searchPersons.")
      .optional(),
    org_id: z
      .number()
      .int()
      .describe("Link to an organization. From searchOrganizations.")
      .optional(),
    owner_id: z
      .number()
      .int()
      .describe("Assigned user id. From listUsers.")
      .optional(),
    done: z
      .boolean()
      .describe("Whether the activity is already complete.")
      .optional(),
    note: z
      .string()
      .describe("Free-text note. Accepts HTML for rich text.")
      .optional(),
    location: z.string().describe("Activity location.").optional(),
  })
  .strict();
const outputSchema = z.object({
  id: z.number().int().describe("Activity id."),
  subject: z.string().describe("Activity subject."),
  type: z
    .string()
    .describe("Activity type key (from listActivityTypes).")
    .nullish(),
  due_date: z
    .union([
      z.string().date().describe("Due date, YYYY-MM-DD."),
      z.null().describe("Due date, YYYY-MM-DD."),
    ])
    .describe("Due date, YYYY-MM-DD.")
    .nullish(),
  due_time: z
    .union([
      z.string().describe("Due time, 24h HH:MM."),
      z.null().describe("Due time, 24h HH:MM."),
    ])
    .describe("Due time, 24h HH:MM.")
    .nullish(),
  duration: z
    .union([
      z.string().describe("Duration, HH:MM."),
      z.null().describe("Duration, HH:MM."),
    ])
    .describe("Duration, HH:MM.")
    .nullish(),
  deal_id: z
    .union([
      z.number().int().describe("Linked deal id."),
      z.null().describe("Linked deal id."),
    ])
    .describe("Linked deal id.")
    .nullish(),
  person_id: z
    .union([
      z.number().int().describe("Linked person id."),
      z.null().describe("Linked person id."),
    ])
    .describe("Linked person id.")
    .nullish(),
  org_id: z
    .union([
      z.number().int().describe("Linked organization id."),
      z.null().describe("Linked organization id."),
    ])
    .describe("Linked organization id.")
    .nullish(),
  owner_id: z.number().int().describe("Assigned user id.").nullish(),
  done: z.boolean().describe("Whether the activity is complete.").nullish(),
  note: z
    .union([
      z.string().describe("Free-text note (HTML allowed)."),
      z.null().describe("Free-text note (HTML allowed)."),
    ])
    .describe("Free-text note (HTML allowed).")
    .nullish(),
  add_time: z
    .string()
    .datetime({ offset: true })
    .describe("Creation time, RFC 3339."),
  update_time: z
    .string()
    .datetime({ offset: true })
    .describe("Last update time, RFC 3339.")
    .nullish(),
});

const definition = defineTool({
  name: "createActivity",
  title: "Create Activity",
  description:
    "Create an activity (call, meeting, task, deadline) optionally linked to a deal, person, or organization. Only subject is required.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "pipedrive",
  run: async (input, ctx) => {
    const url = `https://api.pipedrive.com/api/v2/activities`;
    const body: Record<string, unknown> = {};
    if (input.subject !== undefined) body["subject"] = input.subject;
    if (input.type !== undefined) body["type"] = input.type;
    if (input.due_date !== undefined) body["due_date"] = input.due_date;
    if (input.due_time !== undefined) body["due_time"] = input.due_time;
    if (input.duration !== undefined) body["duration"] = input.duration;
    if (input.deal_id !== undefined) body["deal_id"] = input.deal_id;
    if (input.person_id !== undefined) body["person_id"] = input.person_id;
    if (input.org_id !== undefined) body["org_id"] = input.org_id;
    if (input.owner_id !== undefined) body["owner_id"] = input.owner_id;
    if (input.done !== undefined) body["done"] = input.done;
    if (input.note !== undefined) body["note"] = input.note;
    if (input.location !== undefined) body["location"] = input.location;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const wire = await readPipedrive("createActivity", res);
    return wire.data;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
