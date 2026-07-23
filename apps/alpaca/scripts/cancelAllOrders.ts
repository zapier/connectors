#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z.object({}).strict();
const outputSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.string().describe("Order id."),
        status: z
          .number()
          .int()
          .describe("HTTP status for this order's cancellation."),
      }),
    )
    .describe("Per-order cancellation result (207 multi-status)."),
});

const definition = defineTool({
  name: "cancelAllOrders",
  title: "Cancel All Orders",
  description:
    "Attempt to cancel every open order. Returns a per-order status list; some orders may already be filled and cannot be canceled.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "alpaca",
  run: async (_input, ctx) => {
    const url = `https://paper-api.alpaca.markets/v2/orders`;
    const res = await ctx.fetch(url, {
      method: "DELETE",
    });
    await throwIfNotOk(res, "Alpaca cancelAllOrders");
    return { results: await res.json() };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
