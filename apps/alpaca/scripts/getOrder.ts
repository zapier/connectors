#!/usr/bin/env node
import {
  ConnectorHttpError,
  defineTool,
  handleIfScriptMain,
  readResponseBody,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { orderSchema } from "../lib/alpaca.ts";

const inputSchema = z
  .object({
    order_id: z
      .string()
      .describe("Order id (uuid) from placeOrder or listOrders."),
    nested: z
      .boolean()
      .describe("If true, include child legs for bracket/OCO/OTO orders.")
      .optional(),
  })
  .strict();
const outputSchema = orderSchema;

const definition = defineTool({
  name: "getOrder",
  title: "Get Order",
  description:
    "Get one order by its id, including current status and fill details. Use after placeOrder to confirm the order was accepted or filled.",
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
      `https://paper-api.alpaca.markets/v2/orders/${encodeURIComponent(input.order_id)}`,
    );
    if (input.nested !== undefined) {
      url.searchParams.set("nested", String(input.nested));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    if (!res.ok) {
      const body = await readResponseBody(res);
      throw ConnectorHttpError.fromResponseBody(
        res,
        body,
        res.status === 404
          ? {
              message:
                "Alpaca getOrder: order not found (404) — check the order_id (from placeOrder or listOrders).",
            }
          : { message: "Alpaca getOrder failed" },
      );
    }
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
