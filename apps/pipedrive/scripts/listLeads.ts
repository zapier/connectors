#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive, toRfc3339 } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({
    person_id: z
      .number()
      .int()
      .describe("Leads linked to a person.")
      .optional(),
    organization_id: z
      .number()
      .int()
      .describe("Leads linked to an organization.")
      .optional(),
    owner_id: z
      .number()
      .int()
      .describe("Leads owned by a user. From listUsers.")
      .optional(),
    archived_status: z
      .enum(["archived", "not_archived", "all"])
      .describe("Archived filter.")
      .optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(500)
      .describe(
        "Maximum number of leads to return. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
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
      id: z.string().uuid().describe("Lead id (UUID)."),
      title: z.string().describe("Lead title."),
      owner_id: z.number().int().describe("Owning user id.").nullish(),
      person_id: z
        .union([
          z.number().int().describe("Linked person id."),
          z.null().describe("Linked person id."),
        ])
        .describe("Linked person id.")
        .nullish(),
      organization_id: z
        .union([
          z.number().int().describe("Linked organization id."),
          z.null().describe("Linked organization id."),
        ])
        .describe("Linked organization id.")
        .nullish(),
      value: z
        .union([
          z
            .object({
              amount: z.number().describe("Amount.").nullish(),
              currency: z
                .string()
                .describe("3-letter ISO currency code.")
                .nullish(),
            })
            .describe(
              "Monetary value as { amount, currency } (nested, unlike the flat deal value).",
            ),
          z
            .null()
            .describe(
              "Monetary value as { amount, currency } (nested, unlike the flat deal value).",
            ),
        ])
        .describe(
          "Monetary value as { amount, currency } (nested, unlike the flat deal value).",
        )
        .nullish(),
      label_ids: z
        .array(z.string())
        .describe("Lead label ids (string ids).")
        .nullish(),
      expected_close_date: z
        .union([
          z.string().date().describe("Expected close date, YYYY-MM-DD."),
          z.null().describe("Expected close date, YYYY-MM-DD."),
        ])
        .describe("Expected close date, YYYY-MM-DD.")
        .nullish(),
      add_time: z
        .string()
        .datetime({ offset: true })
        .describe("Creation time, RFC 3339."),
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
  name: "listLeads",
  title: "List Leads",
  description:
    "List leads, filterable by person, organization, owner, or archived state.",
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
    const url = new URL(`https://api.pipedrive.com/v1/leads`);
    if (input.person_id !== undefined) {
      url.searchParams.set("person_id", String(input.person_id));
    }
    if (input.organization_id !== undefined) {
      url.searchParams.set("organization_id", String(input.organization_id));
    }
    if (input.owner_id !== undefined) {
      url.searchParams.set("owner_id", String(input.owner_id));
    }
    if (input.archived_status !== undefined) {
      url.searchParams.set("archived_status", String(input.archived_status));
    }
    url.searchParams.set("limit", String(input.limit ?? 20));
    if (input.start !== undefined) {
      url.searchParams.set("start", String(input.start));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    const wire = await readPipedrive("listLeads", res);
    const pag = wire.additional_data as
      | { pagination?: { next_start?: number | null } }
      | undefined;
    const items = (wire.data as Array<Record<string, unknown>>).map((item) => {
      const rec = { ...item };
      if ("add_time" in rec) rec.add_time = toRfc3339(rec.add_time);
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
