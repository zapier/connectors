#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({
    owner_id: z.number().int().describe("Filter to an owning user.").optional(),
    filter_id: z.number().int().describe("A saved filter id.").optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(500)
      .describe(
        "Maximum number of products to return. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    cursor: z.string().describe("Pagination cursor.").optional(),
  })
  .strict();
const outputSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int().describe("Product id."),
      name: z.string().describe("Product name."),
      code: z
        .union([
          z.string().describe("SKU or product code."),
          z.null().describe("SKU or product code."),
        ])
        .describe("SKU or product code.")
        .nullish(),
      unit: z
        .union([
          z.string().describe("Unit of measure."),
          z.null().describe("Unit of measure."),
        ])
        .describe("Unit of measure.")
        .nullish(),
      prices: z
        .array(
          z.object({
            price: z.number().describe("Price.").nullish(),
            currency: z
              .string()
              .describe("3-letter ISO currency code.")
              .nullish(),
          }),
        )
        .describe("Per-currency pricing.")
        .nullish(),
      owner_id: z.number().int().describe("Owning user id.").nullish(),
      add_time: z
        .string()
        .datetime({ offset: true })
        .describe("Creation time, RFC 3339."),
      custom_fields: z
        .record(z.string(), z.json())
        .describe(
          "Account custom fields keyed by 40-char field hash. Discover keys and option ids via listProductFields.",
        )
        .nullish(),
    }),
  ),
  next_cursor: z
    .union([
      z.string().describe("Cursor for the next page; null when none."),
      z.null().describe("Cursor for the next page; null when none."),
    ])
    .describe("Cursor for the next page; null when none.")
    .nullish(),
});

const definition = defineTool({
  name: "listProducts",
  title: "List Products",
  description: "List catalog products, filterable by owner.",
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
    const url = new URL(`https://api.pipedrive.com/api/v2/products`);
    if (input.owner_id !== undefined) {
      url.searchParams.set("owner_id", String(input.owner_id));
    }
    if (input.filter_id !== undefined) {
      url.searchParams.set("filter_id", String(input.filter_id));
    }
    url.searchParams.set("limit", String(input.limit ?? 20));
    if (input.cursor !== undefined) {
      url.searchParams.set("cursor", String(input.cursor));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    const wire = await readPipedrive("listProducts", res);
    const additional = wire.additional_data as
      | { next_cursor?: string | null }
      | undefined;
    return {
      items: wire.data,
      next_cursor: additional?.next_cursor ?? null,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
