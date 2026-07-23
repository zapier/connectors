# @zapier/alpaca-connector

_Independent, unofficial connector for Alpaca. Not affiliated with, endorsed by, or sponsored by Alpaca. "Alpaca" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable tools for [Alpaca](https://alpaca.markets), wrapping the [Trading API](https://docs.alpaca.markets/reference). 25 scripts let an agent place and manage stock, crypto, and options orders; read account balances, positions, portfolio history, and activities; look up assets, market hours, and option contracts; and read watchlists. Authentication is a long-lived Alpaca **API key id + secret** (two headers), passed directly or via a Zapier-managed connection. Trading defaults to Alpaca's **paper (simulated) environment**; live real-money trading requires an explicit opt-in.

## When to use this

Reach for this connector when an agent needs to trade on a self-directed Alpaca brokerage account: inspecting balances and open positions, placing or canceling orders, looking up assets or option contracts, or reading watchlists. It covers the inform → decide → act → track loop over Alpaca's Trading API.

## When NOT to use this

- **Funding, transfers, or account administration** (deposits/withdrawals, bank links, account opening) — those live on Alpaca's Broker API, not covered here.
- **Market data** — quotes, bars, snapshots, news, corporate actions, and option chains are out of scope; this connector wraps the Trading API only, not the Market Data API (`data.alpaca.markets`). For price/history or live tick streams, use Alpaca's Market Data REST or WebSocket API directly.
- **Broker/partner (white-label) workflows** — the Broker API (`broker-api.alpaca.markets`) is a separate product and is out of scope.

## Install

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

```bash
# Run a script with zero install — npx fetches the package on first use.
# Direct mode reads <PREFIX>_API_KEY_ID + <PREFIX>_API_SECRET_KEY (prefix "ALPACA" below).
export ALPACA_API_KEY_ID=xxx
export ALPACA_API_SECRET_KEY=xxx
npx @zapier/alpaca-connector@latest run getClock '{}' --connection alpaca:ALPACA

# Install as a dependency to import the functions in your own code
npm install @zapier/alpaca-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills add zapier/connectors --skill alpaca
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection` — a _selector_, not the secret. The `<resolver>:` prefix is optional; a bare value is claimed by the first matching resolver. See [Auth](#auth) below for the with/without-Zapier tradeoffs and how to find a connection ID.

### MCP server

Run the connector as an MCP server over stdio so any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) auto-discovers the scripts as tools — add one stanza to the client's config:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "alpaca": {
      "command": "npx",
      "args": ["@zapier/alpaca-connector", "mcp"]
    }
  }
}
```

`--connection` is optional — omit it to pass a connection per tool call, or add `"--connection", "zapier:<connection-id>"` (or `"alpaca:ALPACA"` with `"env": { "ALPACA_API_KEY_ID": "xxx", "ALPACA_API_SECRET_KEY": "xxx" }`) to `args` to set a default.

## Scripts

**Account & portfolio**

| Script                     | Description                                                                     |
| -------------------------- | ------------------------------------------------------------------------------- |
| `getAccount`               | Get account balances, buying power, equity, and trading-permission flags.       |
| `getAccountConfigurations` | Get the account's trading configuration flags.                                  |
| `getPortfolioHistory`      | Get the account's equity and P&L time series over a period.                     |
| `listAccountActivities`    | List account activities — fills, dividends, fees, transfers — by type and date. |

**Orders**

| Script                    | Description                                                         |
| ------------------------- | ------------------------------------------------------------------- |
| `placeOrder`              | Place an order to buy or sell a stock, crypto pair, or option.      |
| `replaceOrder`            | Replace (modify) an open order's quantity, price, or time-in-force. |
| `cancelOrder`             | Cancel one open order by id.                                        |
| `cancelAllOrders`         | Attempt to cancel every open order (per-order status list).         |
| `listOrders`              | List orders, filtered by status, symbols, or side.                  |
| `getOrder`                | Get one order by id, including status and fill details.             |
| `getOrderByClientOrderId` | Get one order by the client_order_id you assigned.                  |

**Positions**

| Script                    | Description                                                          |
| ------------------------- | -------------------------------------------------------------------- |
| `listPositions`           | List all open positions with market value, cost basis, and P&L.      |
| `getPosition`             | Get one open position by symbol or asset id.                         |
| `closePosition`           | Close (liquidate) one position, fully or partially.                  |
| `closeAllPositions`       | Liquidate every open position (optionally cancel open orders first). |
| `exerciseOptionsPosition` | Exercise a held options position by option symbol or contract id.    |

**Assets & market calendar**

| Script              | Description                                                      |
| ------------------- | ---------------------------------------------------------------- |
| `listAssets`        | List tradable assets, filtered by class, status, or exchange.    |
| `getAsset`          | Get one asset by symbol, asset id, or CUSIP (tradability flags). |
| `getClock`          | Get the market clock — is it open now, and the next open/close.  |
| `getMarketCalendar` | Get market trading days with open/close times over a date range. |

**Options contracts**

| Script                | Description                                                                |
| --------------------- | -------------------------------------------------------------------------- |
| `listOptionContracts` | List option contracts for underlyings, filtered by expiration/type/strike. |
| `getOptionContract`   | Get one option contract by OCC symbol or contract id.                      |

**Watchlists**

| Script               | Description                                             |
| -------------------- | ------------------------------------------------------- |
| `listWatchlists`     | List the account's watchlists.                          |
| `getWatchlist`       | Get one watchlist by id, including its asset symbols.   |
| `getWatchlistByName` | Get one watchlist by name, including its asset symbols. |

Run `npx @zapier/alpaca-connector@latest run <script> --help` to see any script's exact input contract + the available resolvers.

## Usage

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function. Pass auth as one `[<resolver>:]<value>` string, e.g. `{ connection: "alpaca:ALPACA" }` (reading `ALPACA_API_KEY_ID` + `ALPACA_API_SECRET_KEY`).

```ts
import { getAsset } from "@zapier/alpaca-connector";

const { data } = await getAsset(
  { symbol_or_asset_id: "AAPL" },
  { connection: "alpaca:ALPACA" },
);
// data => { id, class, exchange, symbol, name, tradable, fractionable, … }
```

## Auth

Already have a connection value? Pass it as shown above — `--connection` for the CLI/MCP shapes, `{ connection }` for imported functions. No connection yet? Pick one:

|                                      | Load                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Pass the credential directly         | [`references/use-without-zapier.md`](references/use-without-zapier.md) |
| Route it through a Zapier connection | [`references/use-with-zapier.md`](references/use-with-zapier.md)       |

## Links

- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Source](https://github.com/zapier/connectors/tree/main/apps/alpaca)
- [Alpaca API reference](https://docs.alpaca.markets/reference) — the vendor API this connector wraps

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Alpaca's API, services, data, schemas, documentation, or other materials, which remain the property of Alpaca. Your use of Alpaca's API is governed by your own agreement with Alpaca.

**Trademarks and affiliation.** Alpaca and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Alpaca.

**Your responsibility.** This connector calls Alpaca's API using credentials you supply. You are responsible for holding a valid Alpaca account, for complying with Alpaca's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Alpaca product. Zapier is not responsible for changes Alpaca makes to its API or for any consequence of your use of Alpaca's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
