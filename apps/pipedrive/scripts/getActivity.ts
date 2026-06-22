#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({
    id: z.number().int().describe("Activity id. From listActivities."),
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
  name: "getActivity",
  title: "Get Activity",
  description: "Fetch one activity by id.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "pipedrive",
  run: async (input, ctx) => {
    const url = `https://api.pipedrive.com/api/v2/activities/${encodeURIComponent(input.id)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    const wire = await readPipedrive("getActivity", res);
    return wire.data;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
