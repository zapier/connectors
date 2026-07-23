#!/usr/bin/env node
// placeOrder's legal field combinations are conditional on order_class
// (bracket/oco need both exits, oto needs exactly one, mleg needs legs) and on
// type (limit/stop need a price). The run()-level superRefine below encodes
// those rules, and the error mapping surfaces Alpaca's common order-rejection
// codes.
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
    symbol: z
      .string()
      .describe(
        "Asset symbol. Stock: AAPL. Crypto pair: BTC/USD. Option: OCC symbol like AAPL241220C00150000.",
      ),
    side: z.enum(["buy", "sell"]),
    qty: z
      .string()
      .describe(
        "Number of shares/units. Supply qty OR notional, not both. Fractional qty is market/day only.",
      )
      .optional(),
    notional: z
      .string()
      .describe(
        "Dollar amount to trade. Supply notional OR qty, not both. Notional is market/day only.",
      )
      .optional(),
    type: z
      .enum(["market", "limit", "stop", "stop_limit", "trailing_stop"])
      .describe(
        "Order type. Supported values vary by security: equity market/limit/stop/stop_limit/trailing_stop; options market/limit; crypto market/limit/stop_limit.",
      )
      .optional(),
    time_in_force: z
      .enum(["day", "gtc", "opg", "cls", "ioc", "fok"])
      .describe(
        "Time in force. Supported values vary by security: equity day/gtc/opg/cls/ioc/fok; options day; crypto gtc/ioc.",
      )
      .optional(),
    limit_price: z
      .string()
      .describe("Required for limit and stop_limit orders.")
      .optional(),
    stop_price: z
      .string()
      .describe("Required for stop and stop_limit orders.")
      .optional(),
    trail_price: z
      .string()
      .describe("Trailing-stop offset in dollars (trailing_stop only).")
      .optional(),
    trail_percent: z
      .string()
      .describe("Trailing-stop offset in percent (trailing_stop only).")
      .optional(),
    extended_hours: z
      .boolean()
      .describe(
        "Trade in extended hours. Only limit orders with tif day/gtc are eligible.",
      )
      .optional(),
    client_order_id: z
      .string()
      .describe(
        "Your own id to track the order (<=128 chars); retrieve via getOrderByClientOrderId.",
      )
      .optional(),
    order_class: z
      .enum(["simple", "bracket", "oco", "oto", "mleg"])
      .describe(
        "simple, bracket/oco/oto (with exit legs), mleg (multi-leg options).",
      )
      .optional(),
    position_intent: z
      .enum(["buy_to_open", "buy_to_close", "sell_to_open", "sell_to_close"])
      .optional(),
    take_profit: z
      .object({
        limit_price: z.string().describe("Take-profit limit price.").optional(),
      })
      .strict()
      .describe("Profit-taking exit (bracket/oto/oco).")
      .optional(),
    stop_loss: z
      .object({
        stop_price: z.string().describe("Stop-loss trigger price.").optional(),
        limit_price: z
          .string()
          .describe("Optional stop-limit price for the exit.")
          .optional(),
      })
      .strict()
      .describe("Stop-loss exit (bracket/oto/oco). stop_price is required.")
      .optional(),
    legs: z
      .array(
        z
          .object({
            symbol: z
              .string()
              .describe("Option contract OCC symbol.")
              .optional(),
            ratio_qty: z
              .string()
              .describe("Leg ratio; the set of ratios must have GCD 1.")
              .optional(),
            side: z.enum(["buy", "sell"]).optional(),
            position_intent: z
              .enum([
                "buy_to_open",
                "buy_to_close",
                "sell_to_open",
                "sell_to_close",
              ])
              .optional(),
          })
          .strict(),
      )
      .max(4)
      .describe(
        "Option legs for order_class mleg (up to 4). Equity legs are not supported.",
      )
      .optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    // qty vs notional are mutually exclusive.
    if (val.qty !== undefined && val.notional !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Supply either qty or notional, not both.",
        path: ["notional"],
      });
    }
    const orderClass = val.order_class ?? "simple";
    const type = val.type ?? "market";

    // Price requirements by order type.
    if (
      (type === "limit" || type === "stop_limit") &&
      val.limit_price === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        message: `limit_price is required for a ${type} order.`,
        path: ["limit_price"],
      });
    }
    if (
      (type === "stop" || type === "stop_limit") &&
      val.stop_price === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        message: `stop_price is required for a ${type} order.`,
        path: ["stop_price"],
      });
    }
    if (
      type === "trailing_stop" &&
      val.trail_price === undefined &&
      val.trail_percent === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "A trailing_stop order requires exactly one of trail_price or trail_percent.",
        path: ["trail_price"],
      });
    }

    // Exit requirements by order_class.
    if (orderClass === "bracket" || orderClass === "oco") {
      if (val.take_profit === undefined || val.stop_loss === undefined) {
        ctx.addIssue({
          code: "custom",
          message: `A ${orderClass} order requires both take_profit and stop_loss.`,
          path: ["order_class"],
        });
      }
    }
    if (orderClass === "oto") {
      const exits = [val.take_profit, val.stop_loss].filter(
        (e) => e !== undefined,
      ).length;
      if (exits !== 1) {
        ctx.addIssue({
          code: "custom",
          message:
            "An oto order requires exactly one of take_profit or stop_loss.",
          path: ["order_class"],
        });
      }
    }
    if (
      orderClass === "mleg" &&
      (val.legs === undefined || val.legs.length === 0)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "An mleg order requires a legs array (1-4 option legs).",
        path: ["legs"],
      });
    }
    // stop_loss, when present, needs a stop_price.
    if (val.stop_loss !== undefined && val.stop_loss.stop_price === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "stop_loss requires a stop_price.",
        path: ["stop_loss", "stop_price"],
      });
    }
  });

const outputSchema = orderSchema;

const definition = defineTool({
  name: "placeOrder",
  title: "Place Order",
  description:
    "Place an order to buy or sell a stock, crypto pair, or option. Supply exactly one of qty (shares/units) or notional (dollar amount). Check buying power via getAccount first. The response acknowledges receipt — status may be accepted/new and change server-side, so re-query getOrder to confirm a fill.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "alpaca",
  run: async (input, ctx) => {
    const url = `https://paper-api.alpaca.markets/v2/orders`;
    const body: Record<string, unknown> = {
      symbol: input.symbol,
      side: input.side,
    };
    if (input.qty !== undefined) body["qty"] = input.qty;
    if (input.notional !== undefined) body["notional"] = input.notional;
    if (input.type !== undefined) body["type"] = input.type;
    if (input.time_in_force !== undefined)
      body["time_in_force"] = input.time_in_force;
    if (input.limit_price !== undefined)
      body["limit_price"] = input.limit_price;
    if (input.stop_price !== undefined) body["stop_price"] = input.stop_price;
    if (input.trail_price !== undefined)
      body["trail_price"] = input.trail_price;
    if (input.trail_percent !== undefined)
      body["trail_percent"] = input.trail_percent;
    if (input.extended_hours !== undefined)
      body["extended_hours"] = input.extended_hours;
    if (input.client_order_id !== undefined)
      body["client_order_id"] = input.client_order_id;
    if (input.order_class !== undefined)
      body["order_class"] = input.order_class;
    if (input.position_intent !== undefined)
      body["position_intent"] = input.position_intent;
    if (input.take_profit !== undefined)
      body["take_profit"] = input.take_profit;
    if (input.stop_loss !== undefined) body["stop_loss"] = input.stop_loss;
    if (input.legs !== undefined) body["legs"] = input.legs;

    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      // Surface Alpaca's common order rejections with the code + message; the
      // full body (which may carry buying_power / cost_basis context) rides on
      // error.response.
      const respBody = await readResponseBody(res);
      const code = (respBody as { code?: number })?.code;
      let hint = "Alpaca placeOrder failed";
      if (res.status === 403) {
        hint =
          "Alpaca placeOrder: rejected (403) — commonly insufficient buying power, short selling disabled, or a permission/account restriction. See the response body's code and message for the specific reason.";
      } else if (res.status === 422) {
        hint =
          "Alpaca placeOrder: invalid order parameters (422) — check the order type's required prices, fractional/notional constraints (market/day, fractionable assets only), or extended-hours eligibility (limit + tif day/gtc).";
      }
      throw ConnectorHttpError.fromResponseBody(res, respBody, {
        message: code !== undefined ? `${hint} (code ${code})` : hint,
      });
    }
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
