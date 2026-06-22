#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive, toRfc3339 } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({
    content: z.string().describe("Note body. HTML is supported for rich text."),
    deal_id: z
      .number()
      .int()
      .describe(
        "Attach to a deal. At least one of deal_id/person_id/org_id/lead_id is required.",
      )
      .optional(),
    person_id: z
      .number()
      .int()
      .describe("Attach to a person. At least one parent id is required.")
      .optional(),
    org_id: z
      .number()
      .int()
      .describe(
        "Attach to an organization. At least one parent id is required.",
      )
      .optional(),
    lead_id: z
      .string()
      .uuid()
      .describe("Attach to a lead (UUID). At least one parent id is required.")
      .optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      v.deal_id === undefined &&
      v.person_id === undefined &&
      v.org_id === undefined &&
      v.lead_id === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "At least one parent id is required (deal_id, person_id, org_id, or lead_id).",
      });
    }
  });
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
  name: "createNote",
  title: "Create Note",
  description:
    "Create a note attached to a deal, person, organization, or lead. Content accepts HTML. Requires a content body and at least one parent id.",
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
    const url = `https://api.pipedrive.com/v1/notes`;
    const body: Record<string, unknown> = {};
    if (input.content !== undefined) body["content"] = input.content;
    if (input.deal_id !== undefined) body["deal_id"] = input.deal_id;
    if (input.person_id !== undefined) body["person_id"] = input.person_id;
    if (input.org_id !== undefined) body["org_id"] = input.org_id;
    if (input.lead_id !== undefined) body["lead_id"] = input.lead_id;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const wire = await readPipedrive("createNote", res);
    const rec = { ...(wire.data as Record<string, unknown>) };
    if ("add_time" in rec) rec.add_time = toRfc3339(rec.add_time);
    if ("update_time" in rec) rec.update_time = toRfc3339(rec.update_time);
    return rec;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
