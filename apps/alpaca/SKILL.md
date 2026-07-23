---
name: alpaca
description: Agent-callable Alpaca trading tools — place and manage stock, crypto, and options orders, read account balances, positions, and portfolio history, look up assets and market hours, and read watchlists. Use when the user mentions Alpaca or wants to trade or inspect a brokerage account, even if they don't name Alpaca explicitly.
license: Elastic-2.0
compatibility: Run `npm install --omit=dev` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for build-it-yourself / prebuilt / alternative-runtime options.
metadata:
  source: https://github.com/zapier/connectors/blob/main/apps/alpaca/SKILL.md
  title: Alpaca
  api-docs: https://docs.alpaca.markets/reference
  zapier-app-key: AlpacaCLIAPI
---

# Alpaca

_Independent, unofficial connector for Alpaca. Not affiliated with, endorsed by, or sponsored by Alpaca. "Alpaca" is a trademark of its owner, used only to identify the service this connector works with._

Tools for trading on [Alpaca](https://alpaca.markets) against the [Trading API](https://docs.alpaca.markets/reference): place and manage stock, crypto, and options orders; read account balances, positions, portfolio history, and activities; look up assets, market hours, and option contracts; and read watchlists. 25 scripts across account, orders, positions, assets, options, and watchlists. **Trades run against Alpaca's paper (simulated) environment by default**; live real-money trading requires an explicit opt-in (see Auth). Money and quantity values are returned as **strings** to preserve decimal precision — never coerce them to numbers. Order placement is **async-confirmed**: `placeOrder` acknowledges receipt with a status that can change server-side, so re-query `getOrder` before asserting a fill.

## When to use this

- **Inspect the account** — read balances and buying power, list open positions and unrealized P&L, review portfolio history and account activities (fills, dividends, fees), or check whether the market is open.
- **Place and manage orders** — buy or sell stocks, crypto, or options (market/limit/stop/bracket/OCO/OTO/multi-leg); replace or cancel open orders; close or liquidate positions; exercise an options position.
- **Look things up** — resolve a symbol's tradability/shortability/fractionability, list assets or option contracts, and read watchlists.

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

If the connector has not been installed as a skill yet, install it first with `npx skills add zapier/connectors --skill alpaca` (or your harness's own skill-install mechanism), then continue here. Installing the skill copies these files, not dependencies. Before running the CLI, a local MCP server, or `zapier-sdk` auth commands, run `npm install --omit=dev` here once. Importing the published package as a dependency in your own project instead? That `npm install` already resolves everything — see [`references/use-as-sdk.md`](references/use-as-sdk.md).

The connector runs on **Node.js 22.18+**. Pick the reference that matches how you're running it, and load it before doing anything else:

| You have...                                                                                                                                                 | Load                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| An MCP-aware client — tools may already be loaded (e.g. `mcp__alpaca__<tool>`), or you can register a local server yourself (or guide the user to)          | [`references/use-as-mcp.md`](references/use-as-mcp.md)       |
| Terminal / subprocess access (you can run `node`)                                                                                                           | [`references/use-as-cli.md`](references/use-as-cli.md)       |
| Only your own code, importing this package as a dependency                                                                                                  | [`references/use-as-sdk.md`](references/use-as-sdk.md)       |
| No tool access, no terminal, no ability to import this package — you write your own code that calls the Alpaca API directly (e.g. a code-execution sandbox) | [`references/use-as-recipe.md`](references/use-as-recipe.md) |

## Scripts

All scripts use the single connection `alpaca`. Trading tools hit the paper host by default (live requires an opt-in — see Auth).

| Script                                                                       | Script name                | Connections | Description                                                                     |
| ---------------------------------------------------------------------------- | -------------------------- | ----------- | ------------------------------------------------------------------------------- |
| [`scripts/getAccount.ts`](scripts/getAccount.ts)                             | `getAccount`               | `alpaca`    | Get account balances, buying power, equity, and trading-permission flags.       |
| [`scripts/getAccountConfigurations.ts`](scripts/getAccountConfigurations.ts) | `getAccountConfigurations` | `alpaca`    | Get the account's trading configuration flags.                                  |
| [`scripts/getPortfolioHistory.ts`](scripts/getPortfolioHistory.ts)           | `getPortfolioHistory`      | `alpaca`    | Get the account's equity and P&L time series over a period.                     |
| [`scripts/listAccountActivities.ts`](scripts/listAccountActivities.ts)       | `listAccountActivities`    | `alpaca`    | List account activities — fills, dividends, fees, transfers — by type and date. |
| [`scripts/placeOrder.ts`](scripts/placeOrder.ts)                             | `placeOrder`               | `alpaca`    | Place an order to buy or sell a stock, crypto pair, or option.                  |
| [`scripts/replaceOrder.ts`](scripts/replaceOrder.ts)                         | `replaceOrder`             | `alpaca`    | Replace (modify) an open order's quantity, price, or time-in-force.             |
| [`scripts/cancelOrder.ts`](scripts/cancelOrder.ts)                           | `cancelOrder`              | `alpaca`    | Cancel one open order by id.                                                    |
| [`scripts/cancelAllOrders.ts`](scripts/cancelAllOrders.ts)                   | `cancelAllOrders`          | `alpaca`    | Attempt to cancel every open order (per-order status list).                     |
| [`scripts/listOrders.ts`](scripts/listOrders.ts)                             | `listOrders`               | `alpaca`    | List orders, filtered by status, symbols, or side.                              |
| [`scripts/getOrder.ts`](scripts/getOrder.ts)                                 | `getOrder`                 | `alpaca`    | Get one order by id, including status and fill details.                         |
| [`scripts/getOrderByClientOrderId.ts`](scripts/getOrderByClientOrderId.ts)   | `getOrderByClientOrderId`  | `alpaca`    | Get one order by the client_order_id you assigned.                              |
| [`scripts/listPositions.ts`](scripts/listPositions.ts)                       | `listPositions`            | `alpaca`    | List all open positions with market value, cost basis, and P&L.                 |
| [`scripts/getPosition.ts`](scripts/getPosition.ts)                           | `getPosition`              | `alpaca`    | Get one open position by symbol or asset id.                                    |
| [`scripts/closePosition.ts`](scripts/closePosition.ts)                       | `closePosition`            | `alpaca`    | Close (liquidate) one position, fully or partially.                             |
| [`scripts/closeAllPositions.ts`](scripts/closeAllPositions.ts)               | `closeAllPositions`        | `alpaca`    | Liquidate every open position (optionally cancel open orders first).            |
| [`scripts/exerciseOptionsPosition.ts`](scripts/exerciseOptionsPosition.ts)   | `exerciseOptionsPosition`  | `alpaca`    | Exercise a held options position by option symbol or contract id.               |
| [`scripts/listAssets.ts`](scripts/listAssets.ts)                             | `listAssets`               | `alpaca`    | List tradable assets, filtered by class, status, or exchange.                   |
| [`scripts/getAsset.ts`](scripts/getAsset.ts)                                 | `getAsset`                 | `alpaca`    | Get one asset by symbol, asset id, or CUSIP (tradability flags).                |
| [`scripts/getClock.ts`](scripts/getClock.ts)                                 | `getClock`                 | `alpaca`    | Get the market clock — is it open now, and the next open/close.                 |
| [`scripts/getMarketCalendar.ts`](scripts/getMarketCalendar.ts)               | `getMarketCalendar`        | `alpaca`    | Get market trading days with open/close times over a date range.                |
| [`scripts/listOptionContracts.ts`](scripts/listOptionContracts.ts)           | `listOptionContracts`      | `alpaca`    | List option contracts for underlyings, filtered by expiration/type/strike.      |
| [`scripts/getOptionContract.ts`](scripts/getOptionContract.ts)               | `getOptionContract`        | `alpaca`    | Get one option contract by OCC symbol or contract id.                           |
| [`scripts/listWatchlists.ts`](scripts/listWatchlists.ts)                     | `listWatchlists`           | `alpaca`    | List the account's watchlists.                                                  |
| [`scripts/getWatchlist.ts`](scripts/getWatchlist.ts)                         | `getWatchlist`             | `alpaca`    | Get one watchlist by id, including its asset symbols.                           |
| [`scripts/getWatchlistByName.ts`](scripts/getWatchlistByName.ts)             | `getWatchlistByName`       | `alpaca`    | Get one watchlist by name, including its asset symbols.                         |

## Disambiguation & refusals

**Disambiguation before a write.** Trade and position tools key on an **exact symbol or id**, not a company name. Before acting on something the user named loosely:

- **Symbols / assets** — if the user gives a company name ("Apple") rather than a ticker, resolve it first with `getAsset` or `listAssets`. If exactly one asset matches, act on it; if several plausibly match, list them (symbol + name + exchange) and ask which. Never guess a ticker.
- **Watchlists** — resolve by name with `getWatchlistByName` or `listWatchlists`. Names are unique per account, so one exact (case-insensitive) match is the answer — act on it, don't over-ask. If nothing matches, say so. This connector **reads** watchlists but does not create or modify them (see Unsupported operations).
- **Orders / positions** — take an `order_id` or `symbol` the user already has (from `listOrders` / `listPositions`). If they describe an order vaguely ("cancel my Tesla order"), list the candidates first and confirm before canceling.

**Unsupported operations — say so and stop; don't fake it with another tool.** This connector deliberately does **not**:

- **Move money** — no deposits, withdrawals, transfers, bank links, or funding. Those live on Alpaca's Broker API and are out of scope.
- **Read market data** — quotes, bars, snapshots, news, corporate actions, and option chains are out of scope. This connector wraps Alpaca's **Trading API** only, not the Market Data API (`data.alpaca.markets`); there are no price/history or streaming tools.
- **Create or modify watchlists, or change account configuration** — this connector **reads** watchlists (`listWatchlists` / `getWatchlist` / `getWatchlistByName`) and account settings (`getAccountConfigurations`) but does not create, update, or delete them.
- **Trade against a live account by default** — trading is paper (simulated) unless the user has explicitly enabled live (see Auth). If asked to trade real money, confirm live is enabled rather than assuming.
- **Manage the stock screener, OAuth apps, or account documents** — not exposed.

If asked for any of these, tell the user it's unsupported and stop — don't substitute an unrelated tool and report success for an action you didn't perform.

## Auth

Every shape passes auth as one connection **selector**, not the secret — a `[<resolver>:]<value>` string. Every connector accepts `zapier:<connection-id>` (Zapier-managed auth — routes through Zapier's auth, retries, and governance layer); some also accept one or more direct-token resolvers (naming and count vary per connector) — check this connector's own resolvers rather than assuming. The `<resolver>:` prefix is optional; a bare value goes to the first resolver that claims it — a UUID-shaped bare value always claims `zapier:`. Each script declares the connections it needs and the resolvers each accepts. The exact syntax for passing a connection (and how to see this connector's resolver list) differs by shape — see the reference you loaded above.

Alpaca authenticates with an **API key id + secret** (two headers), resolved into the one `alpaca` connection slot. Two resolvers:

- **`alpaca:<PREFIX>`** — direct mode. `<PREFIX>` names a pair of environment variables `<PREFIX>_API_KEY_ID` and `<PREFIX>_API_SECRET_KEY` (conventionally `ALPACA` → `ALPACA_API_KEY_ID` + `ALPACA_API_SECRET_KEY`); mint the key/secret in the Alpaca dashboard and copy the secret when it's displayed. The connector injects both as the `APCA-API-KEY-ID` / `APCA-API-SECRET-KEY` headers.
- **`zapier:<connection-id>`** — Zapier-managed auth. Routes through a Zapier Alpaca connection. (Experimental for Alpaca — the direct resolver is the verified path.)

**Paper vs live is a safety boundary — the default is safe.** Trading requests go to the **paper** (simulated-money) host unless you set `ALPACA_TRADING_ENV=live`. Paper and live use **distinct keys** — a paper key against the live host (or vice versa) fails to authenticate (typically `401`); make sure the key matches the environment you're targeting. Live trading is gated twice: order-placing tools refuse the live host unless **both** `ALPACA_TRADING_ENV=live` **and** `ALPACA_ALLOW_LIVE_TRADING=true` are set.

Checking what's already configured first? Don't dump environment values to do it — `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if one is set. Check names only (`env | cut -d= -f1 | grep -i <name>`) or test a known name directly (`[ -n "$VAR_NAME" ]`).

No connection yet? Pick one — and follow the reference's own flow to obtain it; never just ask the user for a connection id or token as if they already have one memorized:

|                                      | Load                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Pass the credential directly         | [`references/use-without-zapier.md`](references/use-without-zapier.md) |
| Route it through a Zapier connection | [`references/use-with-zapier.md`](references/use-with-zapier.md)       |

## Output format

Every script returns a `{ data, meta }` envelope:

- **`data`** — the script's result (the shape its `outputSchema` declares; see the reference you loaded above for how to inspect a script's exact schema in your shape).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths were stripped from `data`: fields the script returned from the API that the `outputSchema` doesn't declare. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked script output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, opt out of output validation (the exact syntax differs by shape — see the reference you loaded above). Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, pass a jq expression that post-processes `data` (again, exact syntax per shape). The jq runs against `data` only, NOT the `{ data, meta }` envelope, so write it rooted at `data` (run the script's `--help` — or your shape's equivalent — to see its output schema). The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated against the output schema.

## References

Load the matching reference file before working in that area:

| Reference                                                              | Covers                                                                                                                                                                                                                                                                                                                                                        | Load it when                                                                                                                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`references/alpaca-api-gotchas.md`](references/alpaca-api-gotchas.md) | Alpaca API behavior the schemas don't capture: auth & paper/live hosts, the `{code, message}` error envelope + status codes, rate limits, pagination, order types/TIF/classes (bracket/oco/oto/mleg), fractional/notional & extended-hours rules, order lifecycle & cancel/replace, position close/liquidate/exercise, and account/watchlist/calendar details | Load before placing, replacing, or canceling orders; closing or exercising positions; or whenever a call returns an unexpected HTTP status or error code |
