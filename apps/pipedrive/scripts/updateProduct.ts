#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({
    id: z.number().int().describe("Product id to update."),
    name: z.string().describe("New name.").optional(),
    code: z.string().describe("SKU or code.").optional(),
    unit: z.string().describe("Unit of measure.").optional(),
    prices: z
      .array(
        z
          .object({
            price: z.number().describe("Price.").optional(),
            currency: z
              .string()
              .describe("3-letter ISO currency code.")
              .optional(),
          })
          .strict(),
      )
      .describe("Replace per-currency prices.")
      .optional(),
    custom_fields: z
      .record(z.string(), z.json())
      .describe(
        "Account custom fields keyed by 40-char hash. Discover via listProductFields.",
      )
      .optional(),
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
  name: "updateProduct",
  title: "Update Product",
  description:
    "Update a catalog product — rename, change code/unit, or replace per-currency prices. Only supplied fields change.",
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
    const url = `https://api.pipedrive.com/api/v2/products/${encodeURIComponent(input.id)}`;
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body["name"] = input.name;
    if (input.code !== undefined) body["code"] = input.code;
    if (input.unit !== undefined) body["unit"] = input.unit;
    if (input.prices !== undefined) body["prices"] = input.prices;
    if (input.custom_fields !== undefined)
      body["custom_fields"] = input.custom_fields;
    const res = await ctx.fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const wire = await readPipedrive("updateProduct", res);
    return wire.data;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
