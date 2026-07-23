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
    underlying_symbols: z
      .string()
      .describe('Comma-separated underlying symbols, e.g. "AAPL,TSLA".')
      .optional(),
    status: z.enum(["active", "inactive"]).optional(),
    expiration_date: z
      .string()
      .describe("Exact expiration (YYYY-MM-DD).")
      .optional(),
    expiration_date_gte: z.string().optional(),
    expiration_date_lte: z.string().optional(),
    type: z.enum(["call", "put"]).optional(),
    style: z.enum(["american", "european"]).optional(),
    strike_price_gte: z.string().optional(),
    strike_price_lte: z.string().optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(10000)
      .describe(
        "Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    page_token: z.string().optional(),
  })
  .strict();
const outputSchema = z.object({
  option_contracts: z
    .array(
      z.object({
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
      }),
    )
    .nullable()
    .optional(),
  next_page_token: z
    .string()
    .nullable()
    .describe("Pass as page_token for the next page; null when no more.")
    .optional(),
});

const definition = defineTool({
  name: "listOptionContracts",
  title: "List Option Contracts",
  description:
    "List option contracts for one or more underlyings, filtered by expiration, type (call/put), and strike range. Use to find a contract symbol to trade.",
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
      `https://paper-api.alpaca.markets/v2/options/contracts`,
    );
    if (input.underlying_symbols !== undefined) {
      url.searchParams.set(
        "underlying_symbols",
        String(input.underlying_symbols),
      );
    }
    if (input.status !== undefined) {
      url.searchParams.set("status", String(input.status));
    }
    if (input.expiration_date !== undefined) {
      url.searchParams.set("expiration_date", String(input.expiration_date));
    }
    if (input.expiration_date_gte !== undefined) {
      url.searchParams.set(
        "expiration_date_gte",
        String(input.expiration_date_gte),
      );
    }
    if (input.expiration_date_lte !== undefined) {
      url.searchParams.set(
        "expiration_date_lte",
        String(input.expiration_date_lte),
      );
    }
    if (input.type !== undefined) {
      url.searchParams.set("type", String(input.type));
    }
    if (input.style !== undefined) {
      url.searchParams.set("style", String(input.style));
    }
    if (input.strike_price_gte !== undefined) {
      url.searchParams.set("strike_price_gte", String(input.strike_price_gte));
    }
    if (input.strike_price_lte !== undefined) {
      url.searchParams.set("strike_price_lte", String(input.strike_price_lte));
    }
    url.searchParams.set("limit", String(input.limit ?? 20));
    if (input.page_token !== undefined) {
      url.searchParams.set("page_token", String(input.page_token));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Alpaca listOptionContracts");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
