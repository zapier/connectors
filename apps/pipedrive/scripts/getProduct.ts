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
      .describe("Product id. From searchProducts or listProducts."),
  })
  .strict();
const outputSchema = z.object({
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
        currency: z.string().describe("3-letter ISO currency code.").nullish(),
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
});

const definition = defineTool({
  name: "getProduct",
  title: "Get Product",
  description: "Fetch one catalog product by id.",
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
    const url = `https://api.pipedrive.com/api/v2/products/${encodeURIComponent(input.id)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    const wire = await readPipedrive("getProduct", res);
    return wire.data;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
