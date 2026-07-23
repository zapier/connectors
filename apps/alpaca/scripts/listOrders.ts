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
    status: z
      .enum(["open", "closed", "all"])
      .describe('Which orders to return. Defaults to "open".')
      .optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(500)
      .describe(
        "Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    after: z
      .string()
      .describe("Only orders submitted after this timestamp (RFC3339).")
      .optional(),
    until: z
      .string()
      .describe("Only orders submitted before this timestamp (RFC3339).")
      .optional(),
    direction: z.enum(["asc", "desc"]).optional(),
    nested: z
      .boolean()
      .describe(
        "If true, roll up bracket/OCO/OTO child legs under each parent order.",
      )
      .optional(),
    symbols: z
      .string()
      .describe('Comma-separated symbols to filter by, e.g. "AAPL,TSLA".')
      .optional(),
    side: z.enum(["buy", "sell"]).optional(),
  })
  .strict();
const outputSchema = z.object({
  orders: z.array(orderSchema).describe("Orders, most recent first."),
});

const definition = defineTool({
  name: "listOrders",
  title: "List Orders",
  description:
    "List orders, most recent first. Filter by status (open/closed/all), symbols, or side. Use getOrder for one order's current state.",
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
    const url = new URL(`https://paper-api.alpaca.markets/v2/orders`);
    if (input.status !== undefined) {
      url.searchParams.set("status", String(input.status));
    }
    url.searchParams.set("limit", String(input.limit ?? 20));
    if (input.after !== undefined) {
      url.searchParams.set("after", String(input.after));
    }
    if (input.until !== undefined) {
      url.searchParams.set("until", String(input.until));
    }
    if (input.direction !== undefined) {
      url.searchParams.set("direction", String(input.direction));
    }
    if (input.nested !== undefined) {
      url.searchParams.set("nested", String(input.nested));
    }
    if (input.symbols !== undefined) {
      url.searchParams.set("symbols", String(input.symbols));
    }
    if (input.side !== undefined) {
      url.searchParams.set("side", String(input.side));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Alpaca listOrders");
    return { orders: await res.json() };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
