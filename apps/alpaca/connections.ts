import {
  defineEnvPrefixResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

/**
 * Alpaca authenticates every Trading-API request, in direct mode, with two
 * custom headers — `APCA-API-KEY-ID` and `APCA-API-SECRET-KEY` (long-lived
 * key + secret, no refresh). Two trading hosts are in play:
 *
 *   - paper trading  → https://paper-api.alpaca.markets   (simulated money)
 *   - live trading   → https://api.alpaca.markets         (REAL money)
 *
 * This connector covers Alpaca's Trading API only. The Market-Data API on
 * data.alpaca.markets is intentionally out of scope (those tools were removed),
 * so there is no market-data host routing here.
 *
 * The bundle bakes the paper host into every script's URL (the safe default).
 * The direct resolver owns host routing — the same per-connection URL-rewrite
 * pattern the shipped telegram / bamboohr connectors use — plus the two-header
 * credential injection: every (trading) path goes to the live host when
 * ALPACA_TRADING_ENV=live, else the baked paper host.
 *
 * Live-trading safety guard: switching to live is a real-money boundary, so a
 * request that would PLACE or EXECUTE a trade on the live host is refused
 * unless ALPACA_ALLOW_LIVE_TRADING=true is set in addition to
 * ALPACA_TRADING_ENV=live. Reads, and everything in paper mode, are never
 * gated. Risk-reducing cancels (DELETE /v2/orders) are not gated either.
 *
 * The two modes use DIFFERENT credentials. Direct mode sends the API key +
 * secret as the APCA-API-KEY-ID / APCA-API-SECRET-KEY headers. Managed mode
 * authenticates via Alpaca OAuth2: Zapier injects `Authorization: Bearer
 * <token>` (not the APCA-* headers) and handles request forwarding. Managed
 * mode always uses the baked paper trading host, so the live/paper switch and
 * the real-money guard are direct-mode-only concerns. Both modes are
 * smoke-verified on the paper account.
 */

const PAPER_TRADING_HOST = "paper-api.alpaca.markets";
const LIVE_TRADING_HOST = "api.alpaca.markets";

// True for trading-host requests that place or execute a real-money trade —
// the set gated behind the live opt-in. Cancels are risk-reducing and excluded.
function movesMoney(method: string, pathname: string): boolean {
  const m = method.toUpperCase();
  // placeOrder
  if (m === "POST" && pathname === "/v2/orders") return true;
  // replaceOrder — submits a replacement order
  if (m === "PATCH" && /^\/v2\/orders\/[^/]+$/.test(pathname)) return true;
  // closePosition / closeAllPositions — submit liquidating market orders
  if (m === "DELETE" && pathname.startsWith("/v2/positions")) return true;
  // exerciseOptionsPosition
  if (m === "POST" && /^\/v2\/positions\/[^/]+\/exercise$/.test(pathname))
    return true;
  return false;
}

// Direct mode: reads <PREFIX>_API_KEY_ID + <PREFIX>_API_SECRET_KEY (e.g.
// ALPACA → ALPACA_API_KEY_ID + ALPACA_API_SECRET_KEY). Auto-claims a bare
// value when both env vars are set.
const directAlpacaResolver = defineEnvPrefixResolver({
  name: "alpaca",
  keys: ["API_KEY_ID", "API_SECRET_KEY"] as const,
  valuePlaceholder: "<ENV_VAR_PREFIX>",
  valueDescription:
    "prefix of <PREFIX>_API_KEY_ID and <PREFIX>_API_SECRET_KEY (e.g. ALPACA → ALPACA_API_KEY_ID + ALPACA_API_SECRET_KEY); injects the APCA-API-KEY-ID / APCA-API-SECRET-KEY headers and routes the trading host. Set ALPACA_TRADING_ENV=live (default paper) plus ALPACA_ALLOW_LIVE_TRADING=true to enable real-money order tools.",
  build: ({ API_KEY_ID, API_SECRET_KEY }) => {
    const live =
      (process.env.ALPACA_TRADING_ENV ?? "paper").toLowerCase() === "live";
    const allowLive = process.env.ALPACA_ALLOW_LIVE_TRADING === "true";
    const tradingHost = live ? LIVE_TRADING_HOST : PAPER_TRADING_HOST;

    return ((input, init = {}) => {
      // Only rewrite plain string / URL inputs; pass Request objects through.
      let urlStr: string | null = null;
      if (typeof input === "string") urlStr = input;
      else if (input instanceof URL) urlStr = input.href;
      if (urlStr === null) return globalThis.fetch(input, init);

      const url = new URL(urlStr);
      if (
        live &&
        !allowLive &&
        movesMoney(init.method ?? "GET", url.pathname)
      ) {
        // Reject (not a sync throw) so the guard behaves like a normal fetch
        // failure for the awaiting run() and never dispatches the request.
        return Promise.reject(
          new Error(
            "Alpaca live trading is not enabled: this tool would place or execute a real-money trade on the live account. " +
              "Set ALPACA_ALLOW_LIVE_TRADING=true (in addition to ALPACA_TRADING_ENV=live) to allow it. " +
              "Paper trading (ALPACA_TRADING_ENV=paper, the default) needs no opt-in.",
          ),
        );
      }
      url.hostname = tradingHost;

      const headers = new Headers(init.headers);
      headers.set("APCA-API-KEY-ID", API_KEY_ID);
      headers.set("APCA-API-SECRET-KEY", API_SECRET_KEY);
      return globalThis.fetch(url.toString(), { ...init, headers });
    }) as typeof globalThis.fetch;
  },
});

export const connectionResolvers = {
  // Managed (Zapier) resolver ships first for install parity (OAuth2 Bearer via
  // Zapier); the direct resolver is the fallback for env-var API key + secret.
  alpaca: [zapierConnectionResolver, directAlpacaResolver],
} as const;
