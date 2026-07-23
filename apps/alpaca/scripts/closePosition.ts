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
    symbol_or_asset_id: z
      .string()
      .describe(
        "Symbol or asset id of the position to close. Crypto pairs use BTC/USD.",
      ),
    qty: z.string().describe("Number of shares/units to liquidate.").optional(),
    percentage: z
      .string()
      .describe("Percent of the position to liquidate (0-100).")
      .optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.qty !== undefined && val.percentage !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Supply at most one of qty or percentage, not both.",
        path: ["percentage"],
      });
    }
  });
const outputSchema = orderSchema;

const definition = defineTool({
  name: "closePosition",
  title: "Close Position",
  description:
    "Close (liquidate) one position by symbol or asset id, fully or partially. Supply at most one of qty or percentage; omit both to close the whole position.",
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
    const url = new URL(
      `https://paper-api.alpaca.markets/v2/positions/${encodeURIComponent(input.symbol_or_asset_id)}`,
    );
    if (input.qty !== undefined) {
      url.searchParams.set("qty", String(input.qty));
    }
    if (input.percentage !== undefined) {
      url.searchParams.set("percentage", String(input.percentage));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "DELETE",
    });
    await throwIfNotOk(res, "Alpaca closePosition");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
