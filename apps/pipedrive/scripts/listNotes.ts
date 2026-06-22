#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive, toRfc3339 } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({
    deal_id: z.number().int().describe("Notes on a deal.").optional(),
    person_id: z.number().int().describe("Notes on a person.").optional(),
    org_id: z.number().int().describe("Notes on an organization.").optional(),
    lead_id: z.string().uuid().describe("Notes on a lead (UUID).").optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(500)
      .describe(
        "Maximum number of notes to return. Defaults to 10 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    start: z
      .number()
      .int()
      .describe("Pagination offset (v1 offset pagination).")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items: z.array(
    z.object({
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
    }),
  ),
  next_start: z
    .union([
      z.number().int().describe("Offset for the next page; null when none."),
      z.null().describe("Offset for the next page; null when none."),
    ])
    .describe("Offset for the next page; null when none.")
    .nullish(),
});

const definition = defineTool({
  name: "listNotes",
  title: "List Notes",
  description:
    "List notes, filterable by their parent record (deal, person, organization, or lead).",
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
    const url = new URL(`https://api.pipedrive.com/v1/notes`);
    if (input.deal_id !== undefined) {
      url.searchParams.set("deal_id", String(input.deal_id));
    }
    if (input.person_id !== undefined) {
      url.searchParams.set("person_id", String(input.person_id));
    }
    if (input.org_id !== undefined) {
      url.searchParams.set("org_id", String(input.org_id));
    }
    if (input.lead_id !== undefined) {
      url.searchParams.set("lead_id", String(input.lead_id));
    }
    url.searchParams.set("limit", String(input.limit ?? 10));
    if (input.start !== undefined) {
      url.searchParams.set("start", String(input.start));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    const wire = await readPipedrive("listNotes", res);
    const pag = wire.additional_data as
      | { pagination?: { next_start?: number | null } }
      | undefined;
    const items = (wire.data as Array<Record<string, unknown>>).map((item) => {
      const rec = { ...item };
      if ("add_time" in rec) rec.add_time = toRfc3339(rec.add_time);
      if ("update_time" in rec) rec.update_time = toRfc3339(rec.update_time);
      return rec;
    });
    return {
      items,
      next_start: pag?.pagination?.next_start ?? null,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
