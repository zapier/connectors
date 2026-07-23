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
    order_id: z.string().describe("Id of the open order to replace."),
    qty: z.string().describe("New quantity (shares/units).").optional(),
    time_in_force: z
      .enum(["day", "gtc", "opg", "cls", "ioc", "fok"])
      .optional(),
    limit_price: z.string().describe("New limit price.").optional(),
    stop_price: z.string().describe("New stop price.").optional(),
    trail: z
      .string()
      .describe("New trailing stop value (price or percent).")
      .optional(),
    client_order_id: z
      .string()
      .describe("New client-supplied id (<=128 chars).")
      .optional(),
  })
  .strict();
const outputSchema = orderSchema;

const definition = defineTool({
  name: "replaceOrder",
  title: "Replace Order",
  description:
    "Replace (modify) an open order's quantity, limit/stop price, or time-in-force. Returns a new order that supersedes the original. A success response does not guarantee the original order was replaced — re-query with getOrder (using the returned id) to confirm.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "alpaca",
  run: async (input, ctx) => {
    const url = `https://paper-api.alpaca.markets/v2/orders/${encodeURIComponent(input.order_id)}`;
    const body: Record<string, unknown> = {};
    if (input.qty !== undefined) body["qty"] = input.qty;
    if (input.time_in_force !== undefined)
      body["time_in_force"] = input.time_in_force;
    if (input.limit_price !== undefined)
      body["limit_price"] = input.limit_price;
    if (input.stop_price !== undefined) body["stop_price"] = input.stop_price;
    if (input.trail !== undefined) body["trail"] = input.trail;
    if (input.client_order_id !== undefined)
      body["client_order_id"] = input.client_order_id;
    const res = await ctx.fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Alpaca replaceOrder");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
