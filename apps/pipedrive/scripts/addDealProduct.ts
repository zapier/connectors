#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({
    id: z.number().int().describe("Deal id."),
    product_id: z
      .number()
      .int()
      .describe(
        "Catalog product id to attach. From searchProducts or listProducts.",
      ),
    item_price: z.number().describe("Unit price for this line item."),
    quantity: z.number().describe("Quantity."),
    discount: z
      .number()
      .describe("Discount amount or percentage (per discount_type).")
      .optional(),
    discount_type: z
      .enum(["percentage", "amount"])
      .describe("How discount is applied.")
      .optional(),
    tax: z.number().describe("Tax for the line item.").optional(),
    comments: z
      .string()
      .describe("Free-text note on the line item.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  id: z
    .number()
    .int()
    .describe(
      "Product-attachment id (the line-item id, distinct from product_id).",
    ),
  product_id: z.number().int().describe("Catalog product id."),
  name: z.string().describe("Product name.").nullish(),
  item_price: z.number().describe("Unit price for this line item.").nullish(),
  quantity: z.number().describe("Quantity.").nullish(),
  currency: z.string().describe("Currency code.").nullish(),
});

const definition = defineTool({
  name: "addDealProduct",
  title: "Add Deal Product",
  description:
    "Attach a product as a line item to a deal, with its unit price and quantity. Each attachment is its own line item with an id distinct from the catalog product_id.",
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
    const url = `https://api.pipedrive.com/api/v2/deals/${encodeURIComponent(input.id)}/products`;
    const body: Record<string, unknown> = {};
    if (input.product_id !== undefined) body["product_id"] = input.product_id;
    if (input.item_price !== undefined) body["item_price"] = input.item_price;
    if (input.quantity !== undefined) body["quantity"] = input.quantity;
    if (input.discount !== undefined) body["discount"] = input.discount;
    if (input.discount_type !== undefined)
      body["discount_type"] = input.discount_type;
    if (input.tax !== undefined) body["tax"] = input.tax;
    if (input.comments !== undefined) body["comments"] = input.comments;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const wire = await readPipedrive("addDealProduct", res);
    return wire.data;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
