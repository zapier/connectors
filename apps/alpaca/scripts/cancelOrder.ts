#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({ order_id: z.string().describe("Id of the order to cancel.") })
  .strict();
const outputSchema = z.object({
  order_id: z.string(),
  canceled: z.literal(true),
});

const definition = defineTool({
  name: "cancelOrder",
  title: "Cancel Order",
  description:
    "Cancel one open order by id. Fails if the order is already filled or done.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "alpaca",
  run: async (input, ctx) => {
    const url = `https://paper-api.alpaca.markets/v2/orders/${encodeURIComponent(input.order_id)}`;
    const res = await ctx.fetch(url, {
      method: "DELETE",
    });
    await throwIfNotOk(res, "Alpaca cancelOrder");
    return { order_id: input.order_id, canceled: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
