#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({
    id: z
      .number()
      .int()
      .describe("Activity id to update. From listActivities."),
    subject: z.string().describe("New subject.").optional(),
    type: z
      .string()
      .describe("New type key. From listActivityTypes.")
      .optional(),
    due_date: z.string().date().describe("Due date, YYYY-MM-DD.").optional(),
    due_time: z
      .string()
      .describe("Due time, 24h HH:MM. Not HH:MM:SS.")
      .optional(),
    duration: z
      .string()
      .describe("Activity duration, same HH:MM clock format as due_time.")
      .optional(),
    done: z.boolean().describe("Mark complete or incomplete.").optional(),
    deal_id: z
      .number()
      .int()
      .describe("Re-link deal. From listDeals.")
      .optional(),
    person_id: z.number().int().describe("Re-link person.").optional(),
    owner_id: z.number().int().describe("Reassign. From listUsers.").optional(),
    note: z.string().describe("Free-text note. Accepts HTML.").optional(),
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
  name: "updateActivity",
  title: "Update Activity",
  description:
    "Update an activity — reschedule, mark done, reassign, or re-link to a deal/person. Only supplied fields change.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "pipedrive",
  run: async (input, ctx) => {
    const url = `https://api.pipedrive.com/api/v2/activities/${encodeURIComponent(input.id)}`;
    const body: Record<string, unknown> = {};
    if (input.subject !== undefined) body["subject"] = input.subject;
    if (input.type !== undefined) body["type"] = input.type;
    if (input.due_date !== undefined) body["due_date"] = input.due_date;
    if (input.due_time !== undefined) body["due_time"] = input.due_time;
    if (input.duration !== undefined) body["duration"] = input.duration;
    if (input.done !== undefined) body["done"] = input.done;
    if (input.deal_id !== undefined) body["deal_id"] = input.deal_id;
    if (input.person_id !== undefined) body["person_id"] = input.person_id;
    if (input.owner_id !== undefined) body["owner_id"] = input.owner_id;
    if (input.note !== undefined) body["note"] = input.note;
    const res = await ctx.fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const wire = await readPipedrive("updateActivity", res);
    return wire.data;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
