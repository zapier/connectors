// Shared Alpaca resource shapes, lifted here because several tools return the
// same objects and their schemas must not drift apart:
//   - assetSchema  → getAsset, listAssets, and every watchlist read
//
// Alpaca returns every monetary or quantity value as a STRING to preserve
// decimal precision (a large value loses precision through a JS number), so
// those fields are z.string() and are never coerced.

import { z } from "zod";

/** A tradable asset (equity, option, or crypto pair). */
export const assetSchema = z.object({
  id: z.string(),
  class: z.string().describe("Asset class: us_equity, us_option, crypto."),
  exchange: z.string().nullable().optional(),
  symbol: z.string(),
  name: z.string().nullable().optional(),
  status: z.enum(["active", "inactive"]),
  tradable: z.boolean(),
  marginable: z.boolean().nullable().optional(),
  shortable: z.boolean().nullable().optional(),
  fractionable: z.boolean().nullable().optional(),
  borrow_status: z.string().nullable().optional(),
  min_order_size: z
    .string()
    .nullable()
    .describe("Crypto minimum order size.")
    .optional(),
  min_trade_increment: z.string().nullable().optional(),
  price_increment: z.string().nullable().optional(),
  cusip: z.string().nullable().optional(),
});

/** A watchlist. `assets` is present on single-watchlist reads. */
export const watchlistSchema = z.object({
  id: z.string(),
  name: z.string(),
  account_id: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  assets: z
    .array(assetSchema)
    .nullable()
    .describe("Assets on the watchlist (present on single-watchlist reads).")
    .optional(),
});

/** An order. Money/quantity fields are strings; `status` is a wide closed set. */
export const orderSchema = z.object({
  id: z.string().describe("Order id (uuid)."),
  client_order_id: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  submitted_at: z.string().nullable().optional(),
  filled_at: z
    .string()
    .nullable()
    .describe("Fill time, or null if not filled.")
    .optional(),
  expired_at: z.string().nullable().optional(),
  canceled_at: z.string().nullable().optional(),
  failed_at: z.string().nullable().optional(),
  replaced_at: z.string().nullable().optional(),
  replaced_by: z
    .string()
    .nullable()
    .describe("Id of the order that replaced this one.")
    .optional(),
  replaces: z.string().nullable().optional(),
  asset_id: z.string().nullable().optional(),
  symbol: z.string(),
  asset_class: z.string().nullable().optional(),
  notional: z.string().nullable().optional(),
  qty: z.string().nullable().optional(),
  filled_qty: z.string().nullable().optional(),
  filled_avg_price: z.string().nullable().optional(),
  order_class: z.string().nullable().optional(),
  type: z
    .string()
    .nullable()
    .describe("market, limit, stop, stop_limit, trailing_stop.")
    .optional(),
  side: z.enum(["buy", "sell"]),
  time_in_force: z.string().nullable().optional(),
  limit_price: z.string().nullable().optional(),
  stop_price: z.string().nullable().optional(),
  status: z
    .string()
    .describe(
      "e.g. new, accepted, partially_filled, filled, canceled, rejected, expired, replaced, pending_new.",
    ),
  extended_hours: z.boolean().nullable().optional(),
  legs: z
    .array(z.json())
    .nullable()
    .describe("Child legs for bracket/OCO/OTO/mleg orders (when nested).")
    .optional(),
});

/** An open position. All monetary/quantity fields are strings. */
export const positionSchema = z.object({
  asset_id: z.string(),
  symbol: z.string(),
  exchange: z.string().nullable().optional(),
  asset_class: z.string().nullable().optional(),
  asset_marginable: z.boolean().nullable().optional(),
  avg_entry_price: z.string().nullable().optional(),
  qty: z.string().describe("Total quantity held (string decimal)."),
  qty_available: z
    .string()
    .nullable()
    .describe("Quantity available to trade.")
    .optional(),
  side: z.enum(["long", "short"]),
  market_value: z.string().nullable().optional(),
  cost_basis: z.string().nullable().optional(),
  unrealized_pl: z
    .string()
    .nullable()
    .describe("Unrealized profit/loss in dollars.")
    .optional(),
  unrealized_plpc: z
    .string()
    .nullable()
    .describe("Unrealized profit/loss as a fraction.")
    .optional(),
  unrealized_intraday_pl: z.string().nullable().optional(),
  unrealized_intraday_plpc: z.string().nullable().optional(),
  current_price: z.string().nullable().optional(),
  lastday_price: z.string().nullable().optional(),
  change_today: z.string().nullable().optional(),
});

/** Account trading configuration flags. */
export const accountConfigSchema = z.object({
  trade_confirm_email: z
    .enum(["all", "none"])
    .nullable()
    .describe("Email on order fills.")
    .optional(),
  suspend_trade: z
    .boolean()
    .nullable()
    .describe("If true, all new orders are blocked.")
    .optional(),
  no_shorting: z
    .boolean()
    .nullable()
    .describe("If true, short selling is disabled.")
    .optional(),
  fractional_trading: z
    .boolean()
    .nullable()
    .describe("If true, fractional-share orders are allowed.")
    .optional(),
  max_margin_multiplier: z.enum(["1", "2", "4"]).nullable().optional(),
  max_options_trading_level: z
    .number()
    .int()
    .nullable()
    .describe("0-3 options trading level cap.")
    .optional(),
  ptp_no_exception_entry: z.boolean().nullable().optional(),
  disable_overnight_trading: z.boolean().nullable().optional(),
});
