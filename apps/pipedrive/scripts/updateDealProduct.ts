#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({
    id: z.number().int().describe("Deal id."),
    product_attachment_id: z
      .number()
      .int()
      .describe("Line-item id from listDealProducts (NOT the product id)."),
    item_price: z.number().describe("New unit price.").optional(),
    quantity: z.number().describe("New quantity.").optional(),
    discount: z.number().describe("New discount.").optional(),
    discount_type: z
      .enum(["percentage", "amount"])
      .describe("How discount is applied.")
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
  name: "updateDealProduct",
  title: "Update Deal Product",
  description:
    "Update a product line item on a deal — change its price, quantity, or discount.",
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
    const url = `https://api.pipedrive.com/api/v2/deals/${encodeURIComponent(input.id)}/products/${encodeURIComponent(input.product_attachment_id)}`;
    const body: Record<string, unknown> = {};
    if (input.item_price !== undefined) body["item_price"] = input.item_price;
    if (input.quantity !== undefined) body["quantity"] = input.quantity;
    if (input.discount !== undefined) body["discount"] = input.discount;
    if (input.discount_type !== undefined)
      body["discount_type"] = input.discount_type;
    const res = await ctx.fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const wire = await readPipedrive("updateDealProduct", res);
    return wire.data;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
