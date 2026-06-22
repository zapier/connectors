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
      .describe("Line-item id from listDealProducts."),
  })
  .strict();
const outputSchema = z.object({
  id: z.number().int().describe("Id of the deleted record."),
});

const definition = defineTool({
  name: "deleteDealProduct",
  title: "Delete Deal Product",
  description:
    "Detach a product line item from a deal. Reversible by re-attaching via addDealProduct; the catalog product is untouched.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "pipedrive",
  run: async (input, ctx) => {
    const url = `https://api.pipedrive.com/api/v2/deals/${encodeURIComponent(input.id)}/products/${encodeURIComponent(input.product_attachment_id)}`;
    const res = await ctx.fetch(url, {
      method: "DELETE",
    });
    const wire = await readPipedrive("deleteDealProduct", res);
    return wire.data;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
