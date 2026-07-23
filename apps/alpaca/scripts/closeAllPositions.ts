#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { orderSchema } from "../lib/alpaca.ts";

const inputSchema = z
  .object({
    cancel_orders: z
      .boolean()
      .describe("If true, cancel all open orders before liquidating.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  results: z
    .array(
      z.object({
        symbol: z.string(),
        status: z
          .number()
          .int()
          .describe("HTTP status for this position's liquidation."),
        body: orderSchema
          .nullable()
          .optional()
          .describe("The liquidating order, when the API returned one."),
      }),
    )
    .describe("Per-position liquidation result (207 multi-status)."),
});

const definition = defineTool({
  name: "closeAllPositions",
  title: "Close All Positions",
  description:
    "Liquidate every open position. Optionally cancel open orders first. Irreversible market action.",
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
    const url = new URL(`https://paper-api.alpaca.markets/v2/positions`);
    if (input.cancel_orders !== undefined) {
      url.searchParams.set("cancel_orders", String(input.cancel_orders));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "DELETE",
    });
    await throwIfNotOk(res, "Alpaca closeAllPositions");
    return { results: await res.json() };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
