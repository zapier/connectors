# @zapier/alpaca-connector

## 0.1.0

### Minor Changes

- 56a90bd: Remove the 7 tools that require Alpaca's OAuth `account:write` scope, which the partner-owned Zapier OAuth app does not grant (they return `403` on the Zapier-managed path): the 6 watchlist writes (`createWatchlist`, `updateWatchlist`, `deleteWatchlist`, `deleteWatchlistByName`, `addAssetToWatchlist`, `removeAssetFromWatchlist`) and `updateAccountConfigurations`. To keep behavior identical across the direct (API key/secret) and Zapier-managed (OAuth) connections, the connector now ships only tools that work on both paths — 25 tools. Watchlist and account-configuration **reads** (`listWatchlists`, `getWatchlist`, `getWatchlistByName`, `getAccountConfigurations`) are retained.
- 56a90bd: Remove the 8 Alpaca market-data tools — `getStockBars`, `getStockSnapshot`, `getLatestStockQuotes`, `getCryptoBars`, `getCryptoSnapshot`, `getNews`, `getCorporateActions`, `getOptionChain`. The connector now wraps Alpaca's **Trading API** only; the Market Data API (`data.alpaca.markets`) is out of scope. Trading-host option tools (`getOptionContract`, `listOptionContracts`, `exerciseOptionsPosition`) are unaffected. The connection resolver's market-data host routing has been removed accordingly.

### Patch Changes

- 56a90bd: Address Phase-4 review findings on the trading tools (issue #2): add the mutually-exclusive `superRefine` guard to `closePosition` (qty vs percentage) and `listAccountActivities` (activity_types vs category) so an agent gets a clean per-tool error instead of an opaque Alpaca 400; pin `id`/`status` (and `symbol`) as required in the `cancelAllOrders` / `closeAllPositions` 207 multi-status output so downstream steps can rely on them; add an actionable close-to-midnight error hint (+ BETA/all-or-nothing note) to `exerciseOptionsPosition`; and soften two unverified factual claims in `placeOrder`'s 403/422 error hints (drop the uncited wash-trade remedy and the "no fractional shorts" assertion).
