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
    period: z
      .string()
      .describe(
        'Length of the window, e.g. "1D", "1W", "1M" (default), "3M", "1A", "all".',
      )
      .optional(),
    timeframe: z
      .enum(["1Min", "5Min", "15Min", "1H", "1D"])
      .describe("Resolution of each data point.")
      .optional(),
    intraday_reporting: z
      .enum(["market_hours", "extended_hours", "continuous"])
      .optional(),
    pnl_reset: z.enum(["no_reset", "per_day"]).optional(),
    start: z
      .string()
      .describe("Window start, RFC3339 or YYYY-MM-DD.")
      .optional(),
    end: z.string().describe("Window end, RFC3339 or YYYY-MM-DD.").optional(),
  })
  .strict();
const outputSchema = z.object({
  timestamp: z
    .array(z.number().int())
    .nullable()
    .describe("Unix epoch timestamps per data point.")
    .optional(),
  equity: z.array(z.number()).nullable().optional(),
  profit_loss: z.array(z.number()).nullable().optional(),
  profit_loss_pct: z.array(z.number()).nullable().optional(),
  base_value: z.number().nullable().optional(),
  timeframe: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "getPortfolioHistory",
  title: "Get Portfolio History",
  description:
    "Get the account's equity and profit/loss time series over a period, for charting or performance questions.",
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
    const url = new URL(
      `https://paper-api.alpaca.markets/v2/account/portfolio/history`,
    );
    if (input.period !== undefined) {
      url.searchParams.set("period", String(input.period));
    }
    if (input.timeframe !== undefined) {
      url.searchParams.set("timeframe", String(input.timeframe));
    }
    if (input.intraday_reporting !== undefined) {
      url.searchParams.set(
        "intraday_reporting",
        String(input.intraday_reporting),
      );
    }
    if (input.pnl_reset !== undefined) {
      url.searchParams.set("pnl_reset", String(input.pnl_reset));
    }
    if (input.start !== undefined) {
      url.searchParams.set("start", String(input.start));
    }
    if (input.end !== undefined) {
      url.searchParams.set("end", String(input.end));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Alpaca getPortfolioHistory");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
