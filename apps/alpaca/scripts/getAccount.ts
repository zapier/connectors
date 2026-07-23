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
  id: z.string().describe("Account id (uuid)."),
  account_number: z.string(),
  status: z.string().describe("e.g. ACTIVE, ACCOUNT_UPDATED."),
  crypto_status: z.string().nullable().optional(),
  currency: z.string().describe("Account currency, e.g. USD."),
  cash: z.string().describe("Cash balance (string decimal)."),
  buying_power: z
    .string()
    .describe("Total buying power (may be up to 4x intraday on margin)."),
  non_marginable_buying_power: z.string().nullable().optional(),
  regt_buying_power: z.string().nullable().optional(),
  daytrading_buying_power: z.string().nullable().optional(),
  options_buying_power: z.string().nullable().optional(),
  equity: z
    .string()
    .describe("Total account value = cash + long/short market value."),
  last_equity: z.string().nullable().optional(),
  long_market_value: z.string().nullable().optional(),
  short_market_value: z.string().nullable().optional(),
  initial_margin: z.string().nullable().optional(),
  maintenance_margin: z.string().nullable().optional(),
  sma: z.string().nullable().optional(),
  multiplier: z
    .string()
    .nullable()
    .describe("Margin multiplier: 1, 2, or 4.")
    .optional(),
  options_approved_level: z.number().int().nullable().optional(),
  options_trading_level: z.number().int().nullable().optional(),
  daytrade_count: z.number().int().nullable().optional(),
  pattern_day_trader: z.boolean().nullable().optional(),
  shorting_enabled: z.boolean().nullable().optional(),
  trading_blocked: z.boolean().nullable().optional(),
  transfers_blocked: z.boolean().nullable().optional(),
  account_blocked: z.boolean().nullable().optional(),
  trade_suspended_by_user: z.boolean().nullable().optional(),
  accrued_fees: z.string().nullable().optional(),
  created_at: z.string().datetime({ offset: true }).nullable().optional(),
});

const definition = defineTool({
  name: "getAccount",
  title: "Get Account",
  description:
    "Get the current account: balances, buying power, equity, margin, and trading-permission flags. Start here to check funds before placing an order.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "alpaca",
  run: async (_input, ctx) => {
    const url = `https://paper-api.alpaca.markets/v2/account`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Alpaca getAccount");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
