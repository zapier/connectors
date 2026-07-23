#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    symbol_or_id: z
      .string()
      .describe("OCC option symbol (e.g. AAPL241220C00150000) or contract id."),
  })
  .strict();
const outputSchema = z.object({
  id: z.string(),
  symbol: z.string().describe("OCC option symbol."),
  name: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  tradable: z.boolean().nullable().optional(),
  expiration_date: z.string().describe("YYYY-MM-DD."),
  root_symbol: z.string().nullable().optional(),
  underlying_symbol: z.string(),
  type: z.enum(["call", "put"]),
  style: z.enum(["american", "european"]).nullable().optional(),
  strike_price: z.string(),
  multiplier: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  open_interest: z.string().nullable().optional(),
  close_price: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "getOptionContract",
  title: "Get Option Contract",
  description:
    "Get one option contract by its OCC symbol or contract id, including strike, expiration, open interest, and deliverables.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "alpaca",
  run: async (input, ctx) => {
    const url = `https://paper-api.alpaca.markets/v2/options/contracts/${encodeURIComponent(input.symbol_or_id)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Alpaca getOptionContract");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
