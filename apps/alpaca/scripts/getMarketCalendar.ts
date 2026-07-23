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
    start: z.string().describe("Range start (YYYY-MM-DD).").optional(),
    end: z.string().describe("Range end (YYYY-MM-DD).").optional(),
    date_type: z.enum(["TRADING", "SETTLEMENT"]).optional(),
  })
  .strict();
const outputSchema = z.object({
  calendar: z
    .array(
      z.object({
        date: z.string().describe("YYYY-MM-DD."),
        open: z.string().describe("Session open time (HH:MM)."),
        close: z.string().describe("Session close, HH:MM."),
        settlement_date: z.string().nullable().optional(),
      }),
    )
    .describe("Trading days with open/close times."),
});

const definition = defineTool({
  name: "getMarketCalendar",
  title: "Get Market Calendar",
  description:
    'Get market trading days with their open/close times over a date range. Use to answer "is the market open on <date>" or find the next session.',
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
    const url = new URL(`https://paper-api.alpaca.markets/v2/calendar`);
    if (input.start !== undefined) {
      url.searchParams.set("start", String(input.start));
    }
    if (input.end !== undefined) {
      url.searchParams.set("end", String(input.end));
    }
    if (input.date_type !== undefined) {
      url.searchParams.set("date_type", String(input.date_type));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Alpaca getMarketCalendar");
    return { calendar: await res.json() };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
