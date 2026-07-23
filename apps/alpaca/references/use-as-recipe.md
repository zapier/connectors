# Using Alpaca without tools, terminal, or imports

This is the write-your-own-code path: no pre-registered tools, no terminal/subprocess access, and no way to `import` this package in-process (for example, a code-execution sandbox that only runs snippets you author). If any of those are actually available instead, use [`references/use-as-mcp.md`](use-as-mcp.md), [`references/use-as-cli.md`](use-as-cli.md), or [`references/use-as-sdk.md`](use-as-sdk.md) — this file is only for when none of them are.

## Base URL and auth

All calls hit the Alpaca Trading API under `/v2`. Pick one environment and use its
matching key pair: paper `https://paper-api.alpaca.markets`, live
`https://api.alpaca.markets`. Every request is an authed request to the endpoint
below — send your `APCA-API-KEY-ID` / `APCA-API-SECRET-KEY` headers (paper vs live
mismatch is the usual 401; see [`alpaca-api-gotchas.md`](alpaca-api-gotchas.md)).
JSON bodies go out with `Content-Type: application/json`.

Money and quantity fields are **strings** on the wire in both directions — keep
them as decimal strings, don't cast to a float. Timestamps are RFC3339 strings.

The response shapes below list field names + types. `null?` marks a
nullable/optional field. Enum values shown for inputs are the accepted set.

## Orders

**Place order** — `POST /v2/orders`, body:

```
symbol: string            # AAPL | BTC/USD | OCC option symbol e.g. AAPL241220C00150000
side: "buy" | "sell"
qty?: string              # shares/units — supply qty OR notional, not both
notional?: string         # dollar amount — supply notional OR qty, not both
type?: "market" | "limit" | "stop" | "stop_limit" | "trailing_stop"
time_in_force?: "day" | "gtc" | "opg" | "cls" | "ioc" | "fok"
limit_price?: string      # required for limit / stop_limit
stop_price?: string       # required for stop / stop_limit
trail_price?: string      # trailing_stop only (exactly one of trail_price/percent)
trail_percent?: string
extended_hours?: boolean
client_order_id?: string  # your id, <= 128 chars
order_class?: "simple" | "bracket" | "oco" | "oto" | "mleg"
position_intent?: "buy_to_open" | "buy_to_close" | "sell_to_open" | "sell_to_close"
take_profit?: { limit_price?: string }
stop_loss?:   { stop_price?: string, limit_price?: string }
legs?: [ { symbol?: string, ratio_qty?: string,
           side?: "buy"|"sell", position_intent?: <as above> } ]   # <= 4, mleg
```

Which combinations are legal depends on `type` and `order_class`, and the accepted
types/TIF vary by security (equity vs crypto vs option). Those rules — plus
fractional/notional, extended-hours, bracket/oco/oto exit-leg, and mleg
(GCD-1 ratios, no equity legs) constraints — live in
[`alpaca-api-gotchas.md`](alpaca-api-gotchas.md); read it before building the body.
The response is a single **order object** (see shape below); it only acknowledges
receipt, so re-read the order to confirm a fill.

**Order object** (returned by place / get / replace / close):

```
id: string, client_order_id: string?, symbol: string, side: "buy"|"sell"
created_at/updated_at/submitted_at/filled_at/expired_at/canceled_at/
  failed_at/replaced_at: string?         # RFC3339
replaced_by: string?, replaces: string?, asset_id: string?, asset_class: string?
notional/qty/filled_qty/filled_avg_price: string?
order_class: string?, type: string?, time_in_force: string?
limit_price: string?, stop_price: string?
status: string                          # new/accepted/partially_filled/filled/...
extended_hours: boolean?
legs: array?                            # child legs when nested
```

- **Get order** — `GET /v2/orders/{order_id}` (optional `?nested=true` to roll up
  child legs). Returns one order object. 404 if the id is unknown.
- **Get order by client id** — `GET /v2/orders:by_client_order_id?client_order_id=…`.
  Returns one order object.
- **List orders** — `GET /v2/orders` with optional
  `status` (`open`|`closed`|`all`), `limit` (1–500), `after`, `until`,
  `direction` (`asc`|`desc`), `nested`, `symbols` (comma-separated), `side`.
  Returns an array of order objects (most recent first).
- **Replace order** — `PATCH /v2/orders/{order_id}`, body any of
  `qty`, `time_in_force`, `limit_price`, `stop_price`, `trail`, `client_order_id`.
  Returns a **new** order object that supersedes the original — confirm via the
  returned id (see gotchas: success ≠ replaced).
- **Cancel order** — `DELETE /v2/orders/{order_id}`. Success is HTTP 204; model it
  as `{ order_id, canceled: true }`. Fails if the order is already terminal.
- **Cancel all orders** — `DELETE /v2/orders`. Returns HTTP 207 with an array of
  `{ id: string?, status: number? }` — one entry per order (some may fail with
  500 if no longer cancelable).

## Positions

- **List positions** — `GET /v2/positions`. Array of **position objects**:
  ```
  asset_id: string, symbol: string, side: "long"|"short"
  exchange/asset_class: string?, asset_marginable: boolean?
  avg_entry_price/qty: string, qty_available: string?
  market_value/cost_basis: string?
  unrealized_pl/unrealized_plpc/unrealized_intraday_pl/unrealized_intraday_plpc: string?
  current_price/lastday_price/change_today: string?
  ```
- **Get position** — `GET /v2/positions/{symbol_or_asset_id}` (crypto pair
  `BTC/USD`, slash URL-encoded). Returns one position object; when no position is
  held it returns a not-found rather than data — see
  [`alpaca-api-gotchas.md`](alpaca-api-gotchas.md) (SDK-tier; treat as a clean
  "none").
- **Close position** — `DELETE /v2/positions/{symbol_or_asset_id}` with optional
  `?qty=` or `?percentage=` (at most one; omit both to close all of it). Returns an
  order object for the liquidating order.
- **Close all positions** — `DELETE /v2/positions` with optional
  `?cancel_orders=true`. Returns HTTP 207 with an array of
  `{ symbol: string?, status: number?, body: <order object>? }`.
- **Exercise options position** — `POST /v2/positions/{symbol_or_contract_id}/exercise`,
  no body. All held shares of that contract are exercised; model success as
  `{ symbol_or_contract_id, exercise_requested: true }`.

## Account, assets, options, market info

- **Get account** — `GET /v2/account`. Object with `id`, `account_number`,
  `status`, `currency`, and string balances `cash`, `buying_power`, `equity`
  (plus `*_buying_power`, `long/short_market_value`, `initial/maintenance_margin`,
  `sma`, `multiplier`, `accrued_fees`) and boolean flags `trading_blocked`,
  `account_blocked`, `pattern_day_trader`, `shorting_enabled`, etc. Check buying
  power here before placing an order.
- **Get account configurations** — `GET /v2/account/configurations`. Flags
  `trade_confirm_email` (`all`|`none`), `suspend_trade`, `no_shorting`,
  `fractional_trading`, `max_margin_multiplier` (`1`|`2`|`4`),
  `max_options_trading_level`, `ptp_no_exception_entry`,
  `disable_overnight_trading`.
- **Portfolio history** — `GET /v2/account/portfolio/history` with optional
  `period`, `timeframe` (`1Min`|`5Min`|`15Min`|`1H`|`1D`), `intraday_reporting`,
  `pnl_reset`, `start`, `end`. Returns parallel numeric arrays `timestamp` (epoch),
  `equity`, `profit_loss`, `profit_loss_pct`, plus `base_value`, `timeframe`.
- **List account activities** — `GET /v2/account/activities` with optional
  `activity_types` (comma-separated), `category`
  (`trade_activity`|`non_trade_activity`), `date`, `after`, `until`, `direction`,
  `page_size` (1–100), `page_token`. Array of activity objects
  (`id`, `activity_type`, `transaction_time`, `type`, `symbol`, `side`, `qty`,
  `price`, `net_amount`, `date`, `description` — all `string?`). Cursor-paginate
  via `page_token`.
- **List assets** — `GET /v2/assets` with optional `status`
  (`active`|`inactive`), `asset_class` (`us_equity`|`us_option`|`crypto`),
  `exchange`. Array of **asset objects** — no pagination, so always filter:
  ```
  id: string, class: string, symbol: string, status: "active"|"inactive"
  tradable: boolean, exchange/name: string?
  marginable/shortable/fractionable: boolean?
  borrow_status/min_order_size/min_trade_increment/price_increment/cusip: string?
  ```
- **Get asset** — `GET /v2/assets/{symbol_or_asset_id}` (symbol, asset id, or
  CUSIP; crypto pair `BTC/USD`). Returns one asset object.
- **List option contracts** — `GET /v2/options/contracts` with optional
  `underlying_symbols`, `status`, `expiration_date`(`_gte`/`_lte`), `type`
  (`call`|`put`), `style` (`american`|`european`), `strike_price_gte`/`_lte`,
  `limit` (1–10000), `page_token`. Returns `{ option_contracts: [...], next_page_token }`;
  each contract has `id`, `symbol`, `expiration_date`, `underlying_symbol`,
  `type`, `strike_price`, and optional `name/status/tradable/root_symbol/style/
multiplier/size/open_interest/close_price`.
- **Get option contract** — `GET /v2/options/contracts/{symbol_or_id}`. Returns one
  contract object (same fields).
- **Get clock** — `GET /v2/clock`. `{ timestamp, is_open: boolean, next_open?,
next_close? }`.
- **Get market calendar** — `GET /v2/calendar` with optional `start`, `end`,
  `date_type` (`TRADING`|`SETTLEMENT`). Array of
  `{ date, open, close, settlement_date? }`.

## Errors

Non-2xx responses carry a JSON body of the shape `{ "code": <number>, "message":
<string> }` (a rejection may add fields like `buying_power`/`cost_basis`). Don't
map codes here — see the recovery table in
[`alpaca-api-gotchas.md`](alpaca-api-gotchas.md) for what each `code`/HTTP status
means and how to recover. The rate limit and the critical order-construction rules
(price requirements, qty-vs-notional, extended hours, security-specific
type/TIF, multi-leg) also live there — read it before implementing order placement.
