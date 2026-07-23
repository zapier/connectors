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
    client_order_id: z
      .string()
      .describe("The client-supplied id passed to placeOrder."),
  })
  .strict();
const outputSchema = orderSchema;

const definition = defineTool({
  name: "getOrderByClientOrderId",
  title: "Get Order By Client Order Id",
  description:
    "Get one order by the client_order_id you assigned when placing it. Use when you tracked your own id instead of Alpaca's order id.",
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
      `https://paper-api.alpaca.markets/v2/orders:by_client_order_id`,
    );
    if (input.client_order_id !== undefined) {
      url.searchParams.set("client_order_id", String(input.client_order_id));
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
                "Alpaca getOrderByClientOrderId: order not found (404) — check the client_order_id you assigned on placeOrder.",
            }
          : { message: "Alpaca getOrderByClientOrderId failed" },
      );
    }
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
