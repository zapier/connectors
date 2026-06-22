#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive, toRfc3339 } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({
    id: z.number().int().describe("Note id to update. From listNotes."),
    content: z
      .string()
      .describe("New note body. HTML is supported.")
      .optional(),
    deal_id: z.number().int().describe("Re-attach to a deal.").optional(),
    person_id: z.number().int().describe("Re-attach to a person.").optional(),
  })
  .strict();
const outputSchema = z.object({
  id: z.number().int().describe("Note id."),
  content: z.string().describe("Note body (HTML)."),
  deal_id: z
    .union([
      z.number().int().describe("Attached deal id."),
      z.null().describe("Attached deal id."),
    ])
    .describe("Attached deal id.")
    .nullish(),
  person_id: z
    .union([
      z.number().int().describe("Attached person id."),
      z.null().describe("Attached person id."),
    ])
    .describe("Attached person id.")
    .nullish(),
  org_id: z
    .union([
      z.number().int().describe("Attached organization id."),
      z.null().describe("Attached organization id."),
    ])
    .describe("Attached organization id.")
    .nullish(),
  lead_id: z
    .union([
      z.string().describe("Attached lead id (UUID)."),
      z.null().describe("Attached lead id (UUID)."),
    ])
    .describe("Attached lead id (UUID).")
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
  name: "updateNote",
  title: "Update Note",
  description:
    "Update a note's content or re-attach it to a different record. v1 notes use PUT (not PATCH).",
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
    const url = `https://api.pipedrive.com/v1/notes/${encodeURIComponent(input.id)}`;
    const body: Record<string, unknown> = {};
    if (input.content !== undefined) body["content"] = input.content;
    if (input.deal_id !== undefined) body["deal_id"] = input.deal_id;
    if (input.person_id !== undefined) body["person_id"] = input.person_id;
    const res = await ctx.fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const wire = await readPipedrive("updateNote", res);
    const rec = { ...(wire.data as Record<string, unknown>) };
    if ("add_time" in rec) rec.add_time = toRfc3339(rec.add_time);
    if ("update_time" in rec) rec.update_time = toRfc3339(rec.update_time);
    return rec;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
