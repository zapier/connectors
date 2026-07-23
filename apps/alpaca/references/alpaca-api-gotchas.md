# Alpaca Trading API gotchas

App-specific behavior of the Alpaca **Trading API** (`/v2`) that the Zod schemas
don't capture. Every non-obvious claim links the public Alpaca doc that backs it.
This connector wraps the Trading API only — there is no market-data surface here.

## Hosts, auth, and versioning

- Two independent environments, each with **its own key pair**: paper
  (`https://paper-api.alpaca.markets`) and live (`https://api.alpaca.markets`).
  Paper is a real-time **simulation** — "Paper trading is a real-time simulation
  environment where you can test your code" and "is not a substitute for real
  trading." Your paper account "will have a different API key from your live
  account," but "The API spec is the same between the paper trading and live
  accounts." ([paper trading](https://docs.alpaca.markets/us/docs/paper-trading))
- Authenticate with two headers, not a bearer token: "The client must provide a
  pair of API key ID and secret key in the HTTP request headers named
  `APCA-API-KEY-ID` and `APCA-API-SECRET-KEY`, respectively."
  ([authentication](https://docs.alpaca.markets/us/v1.1/docs/authentication-1))
- A **401** most often means the key pair and the host don't match (paper key
  against the live host, or vice-versa). ([error guide](https://alpaca.markets/learn/how-to-fix-common-trading-api-errors-at-alpaca))
- All endpoints are under `/v2`.

## Money and quantities are strings

Every monetary or quantity value comes back as a JSON **string**, not a number.
The account schema declares each balance field with `"type": "string"` — `cash`,
`buying_power`, and `equity` are all strings, for example.
([account](https://docs.alpaca.markets/us/reference/getaccount-1)) Parse them with
a decimal-safe type; a JS `number` loses precision on large balances.
Order/position sizes (`qty`, `notional`, `limit_price`, `strike_price`, …) are
strings for the same reason.

## Error envelope and recovery table

Errors are JSON of the shape `{"code": <number>, "message": <string>}`, e.g.
`{"code": 40010001, "message": "invalid order type"}`. A rejection can carry extra
context alongside those two keys, e.g.
`{"buying_power":"...","code":40310000,"cost_basis":"...","message":"insufficient buying power"}`.
([error guide](https://alpaca.markets/learn/how-to-fix-common-trading-api-errors-at-alpaca))

| HTTP      | code     | Means                                                                                                                                                                             | Recovery                                                                                   |
| --------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 401       | —        | Bad/mismatched credentials                                                                                                                                                        | Confirm the key pair matches the host (paper vs live) and the exact header names.          |
| 403       | 40310000 | Insufficient buying power                                                                                                                                                         | Reduce `qty`/`notional` or add funds; check `getAccount` buying power first.               |
| 403       | 40310000 | Asset not fractionable                                                                                                                                                            | Only whole shares for that symbol; check `fractionable` via `getAsset`.                    |
| 403       | 40310000 | Account not allowed to short                                                                                                                                                      | Shorting disabled (or `max_margin_multiplier` = 1); a sell with no long is a short.        |
| 403       | 40310000 | Account not authorized to trade / restricted to liquidation                                                                                                                       | Trading blocked; check `getAccount` status flags.                                          |
| 403       | 40310100 | Pattern-day-trading protection                                                                                                                                                    | Would be the 4th day trade in 5 days.                                                      |
| 403       | —        | Insufficient shares (held by open orders, bracket child orders, boxed long+short, or a race with a pending cancel)                                                                | Cancel the conflicting/opposing order first, or wait for the cancel to settle, then retry. |
| 404       | —        | Resource not found                                                                                                                                                                | Order/position/asset id or symbol doesn't exist (see per-tool notes).                      |
| 422       | 40010001 | Invalid order parameters (missing required price, bad type/TIF, `qty`+`notional` together, `notional` < 1.00)                                                                     | Fix the field the message names.                                                           |
| 422       | 42210000 | Order-shape rule violated (extended-hours must be DAY/GTC limit; fractional must be DAY; trailing needs exactly one of trail_price/trail_percent; fractional can't be sold short) | Adjust to the stated rule.                                                                 |
| 429       | —        | Rate limit exceeded                                                                                                                                                               | Back off and retry (see below).                                                            |
| 500       | —        | On cancel-all: an order is no longer cancelable                                                                                                                                   | Expected for already-terminal orders; inspect the per-order results.                       |
| 503 / 504 | —        | Backend down / timeout                                                                                                                                                            | Retry; verify order status before resubmitting.                                            |

Source for the code→message mappings: [error guide](https://alpaca.markets/learn/how-to-fix-common-trading-api-errors-at-alpaca).

## Rate limit

"currently 200 requests per minute, per account"; exceeding it returns a "429-
Too Many Requests" status.
([usage limit](https://alpaca.markets/support/usage-limit-api-calls))

## Pagination

Not uniform across endpoints:

- **Account activities** and **option contracts** use cursor pagination: pass the
  `page_token` from the previous page's `next_page_token` (activities: "Provide
  the ID of the last activity from the last page to retrieve the next set").
  Activities `page_size` default is 100, range 1–100; option contracts `limit`
  default 100, max 10000.
  ([activities](https://docs.alpaca.markets/us/reference/getaccountactivities-2),
  [option contracts](https://docs.alpaca.markets/us/reference/get-options-contracts))
- **List orders** has no cursor — it uses `limit` ("Defaults to 50 and max is
  500") plus `after`/`until` timestamp windows and `direction` (default `desc`).
  ([list orders](https://docs.alpaca.markets/us/reference/getallorders-1))
- **List assets** has **no pagination at all** — it returns every matching asset
  in one array, so always filter by `asset_class`/`status`/`exchange`.
  ([list assets](https://docs.alpaca.markets/us/reference/get-v2-assets-1))

## Orders

**Order types and TIF are security-dependent.** Equity supports
market/limit/stop/stop_limit/trailing_stop and TIF day/gtc/opg/cls/ioc/fok
([orders](https://docs.alpaca.markets/us/docs/orders-at-alpaca)). Crypto: "Market,
Limit and Stop Limit orders are supported" and "the supported `time_in_force`
values are `gtc`, and `ioc`"
([crypto](https://docs.alpaca.markets/us/docs/crypto-trading)). Options: "type
must be market, limit, stop or, stop_limit (stop and stop_limit are only available
for single-leg orders)" and "time_in_force must be day or gtc"
([options](https://docs.alpaca.markets/us/docs/options-trading)).

**Price requirements** ([create order](https://docs.alpaca.markets/us/reference/postorder)):
`limit_price` "Required if type is `limit` or `stop_limit`"; `stop_price`
"required if type is `stop` or `stop_limit`"; for `trailing_stop`, exactly one of
`trail_price` or `trail_percent`.

**qty vs notional.** `qty` is the "number of shares to trade. Can be fractionable
for only market and day order types." `notional` is the "dollar amount to trade.
Cannot work with `qty`." Supply exactly one. Fractional/notional orders must be
DAY orders and "cannot be sold short" (422 `42210000`).
([create order](https://docs.alpaca.markets/us/reference/postorder),
[error guide](https://alpaca.markets/learn/how-to-fix-common-trading-api-errors-at-alpaca))

**Extended hours.** "Only limit orders with `time_in_force` set to `day` or `gtc`
orders are accepted as extended hours eligible."
([orders](https://docs.alpaca.markets/us/docs/orders-at-alpaca))

**Order classes.** `simple` (or `""`), `bracket`, `oco`, `oto`, `mleg`. A bracket
needs both a `take_profit` and a `stop_loss`; an OCO is a pair of exit orders on an
existing position (must be `limit`); an OTO attaches exactly one exit to an entry.
([create order](https://docs.alpaca.markets/us/reference/postorder),
[orders](https://docs.alpaca.markets/us/docs/orders-at-alpaca))

**Multi-leg (`mleg`).** Up to 4 legs (`legs` "(<= 4)")
([create order](https://docs.alpaca.markets/us/reference/postorder)). Each leg's
`ratio_qty` must be in simplest form — "the greatest common divisor (GCD) among
the `leg_ratio` values for the legs must be 1" (enter 2:4 as 1:2). "MLeg orders
that include an equity leg are not supported at this time."
([options level 3](https://docs.alpaca.markets/docs/options-level-3-trading))

**Placing an order only acknowledges receipt.** The returned status may be
`accepted` or `new` and change server-side; re-query `getOrder` to confirm a fill.
Status values: `new` ("received by Alpaca, and routed to exchanges"),
`partially_filled`, `filled` ("no further updates will occur"), `canceled`,
`expired`, `replaced` ("replaced by another order, or … a corporate action"),
`accepted` ("received … but hasn't yet been routed"), `pending_new`,
`pending_cancel`, `pending_replace`, `rejected`, plus `done_for_day`,
`calculated`, `stopped`, `suspended`.
([orders](https://docs.alpaca.markets/us/docs/orders-at-alpaca))

**Cancel / replace semantics.** An order can be canceled "up until the point it
reaches a state of either `filled`, `canceled`, or `expired`"; canceling a
terminal order fails (422 "The order status is not cancelable").
([orders](https://docs.alpaca.markets/us/docs/orders-at-alpaca),
[cancel order](https://docs.alpaca.markets/us/reference/deleteorderbyorderid-1))
Replace returns "The new Order object with the new order ID" and links via
`replaces`/`replaced_by`, but "A success return code from a replaced order does
NOT guarantee the existing open order has been replaced" — re-query with the
returned id. ([replace order](https://docs.alpaca.markets/us/reference/patchorderbyorderid-1))

**Cancel-all is multi-status.** Cancel-all "Attempts to cancel all open orders. A
response will be provided for each order" and returns HTTP 207 with "the order id
and http status code for each"; "If an order is no longer cancelable, the server
will respond with status 500" for that entry.
([cancel all](https://docs.alpaca.markets/us/reference/deleteallorders-1))

## Positions

- **Close one position** (`DELETE /v2/positions/{symbol_or_asset_id}`): `qty`
  "the number of shares to liquidate … Cannot work with percentage"; `percentage`
  "Must be between 0 and 100 … Cannot work with qty." Omit both to close the whole
  position. ([close position](https://docs.alpaca.markets/us/reference/deleteopenposition-1))
- **Close all positions** returns 207 "Multi-Status" with an array of per-position
  results (`symbol`, `status` = "HTTP status code for the attempt to close this
  position", and the liquidating order `body`). The `cancel_orders` flag: "If true
  is specified, cancel all open orders before liquidating all positions."
  ([close all](https://docs.alpaca.markets/us/reference/deleteallopenpositions-1))
- **Get one position** returns 404 when no position is held in that asset — treat
  it as a clean "none," not a hard failure (the Alpaca SDK notes get-open-position
  "throws an APIError if the position does not exist"; not spelled out in the REST
  reference). ([alpaca-py positions](https://alpaca.markets/sdks/python/api_reference/trading/positions.html))
- **Exercise an option position** (`POST …/exercise`): "All available held shares
  of this option contract will be exercised," there is no request body, and it
  returns 200 "Exercise instruction successfully submitted."
  ([exercise](https://docs.alpaca.markets/us/reference/optionexercise))

## Account, assets, options, market info

- **Account** buying power depends on the margin `multiplier`: "valid values 1
  (standard limited margin … 1x), 2 (reg T margin … 2x intraday and overnight …
  default for all non-PDT accounts with $2,000 or more equity), 4 (PDT account …
  4x intraday … 2x reg T overnight)"; `buying_power` is the "Current available $
  buying power." Flags: `trading_blocked` "If true, the account is not allowed to
  place orders"; `account_blocked` "If true, the account activity by user is
  prohibited"; `shorting_enabled` "whether or not the account is permitted to
  short." ([account](https://docs.alpaca.markets/us/reference/getaccount-1))
- **Assets**: `asset_class` "Defaults to us_equity"; the single-asset lookup path
  accepts "symbol or assetId. CUSIP is also accepted for US equities";
  `min_order_size` is "Field available for crypto only." Symbols: stock `AAPL`,
  crypto pair `BTC/USD` (previously `BTCUSD`), option OCC symbol like
  `AAPL240119C00100000`.
  ([list assets](https://docs.alpaca.markets/us/reference/get-v2-assets-1),
  [get asset](https://docs.alpaca.markets/us/reference/get-v2-assets-symbol_or_asset_id),
  [crypto](https://docs.alpaca.markets/us/docs/crypto-trading),
  [options](https://docs.alpaca.markets/us/docs/options-trading))
- **Options trading levels** run 0–3: 0 disabled, 1 covered call / cash-secured
  put, 2 adds buy call/put, 3 adds spreads (`mleg`).
  ([options](https://docs.alpaca.markets/us/docs/options-trading))
- **Portfolio history** `period` "Defaults to 1M" (D/W/M/A units); `timeframe` one
  of 1Min/5Min/15Min/1H/1D; response arrays `timestamp` (UNIX epoch), `equity`,
  `profit_loss`, `profit_loss_pct`, and scalar `base_value`.
  ([portfolio history](https://docs.alpaca.markets/us/reference/getaccountportfoliohistory-1))
- **Account activities**: `activity_type` codes include FILL, DIV, CSD, FEE (and
  many more); `category` is `trade_activity`/`non_trade_activity` and "Cannot be
  used with 'activity_types'." For FILL activities the `type` field is "fill" or
  "partial_fill." `date` filters by creation date.
  ([activities](https://docs.alpaca.markets/us/reference/getaccountactivities-2),
  [account activities](https://docs.alpaca.markets/us/docs/account-activities))
- **Watchlists (read only here)**: the list view returns `id`, `name`,
  `account_id`, `created_at`, `updated_at` with **no** `assets`; fetch a single
  watchlist (by id or name) to get its `assets`.
  ([watchlists](https://docs.alpaca.markets/us/reference/getwatchlists-1))
- **Market clock**: `is_open` "Whether or not the market is open," `next_open`
  "Next market open timestamp," `next_close` "Next market close timestamp."
  ([clock](https://docs.alpaca.markets/us/reference/legacyclock))
