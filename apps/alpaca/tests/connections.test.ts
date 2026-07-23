import { afterEach, describe, expect, it } from "vitest";

import { connectionResolvers } from "../connections.ts";

// The direct (env-prefix) resolver is second in the chain. Given a prefix, it
// reads <PREFIX>_API_KEY_ID + <PREFIX>_API_SECRET_KEY, injects the two APCA
// headers, and routes the paper/live trading host.
const directResolver = connectionResolvers.alpaca[1];

function captureFetch(): {
  install: () => void;
  calls: Array<{ url: string; init?: RequestInit }>;
} {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  return {
    calls,
    install: () => {
      globalThis.fetch = (async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        return { ok: true, status: 200 } as unknown as Response;
      }) as typeof globalThis.fetch;
    },
  };
}

describe("alpaca connection resolver", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.ALPACA_TEST_API_KEY_ID;
    delete process.env.ALPACA_TEST_API_SECRET_KEY;
    delete process.env.ALPACA_TRADING_ENV;
    delete process.env.ALPACA_ALLOW_LIVE_TRADING;
  });

  function setCreds() {
    process.env.ALPACA_TEST_API_KEY_ID = "key-id-123";
    process.env.ALPACA_TEST_API_SECRET_KEY = "secret-456";
  }

  it("injects both APCA headers and keeps the paper host by default", async () => {
    setCreds();
    const cap = captureFetch();
    cap.install();

    const fetch = await directResolver.resolve("ALPACA_TEST");
    await fetch("https://paper-api.alpaca.markets/v2/account");

    const call = cap.calls[0];
    expect(call?.url).toBe("https://paper-api.alpaca.markets/v2/account");
    const headers = new Headers(call?.init?.headers);
    expect(headers.get("APCA-API-KEY-ID")).toBe("key-id-123");
    expect(headers.get("APCA-API-SECRET-KEY")).toBe("secret-456");
  });

  it("routes to the live trading host when env=live and live is allowed", async () => {
    setCreds();
    process.env.ALPACA_TRADING_ENV = "live";
    process.env.ALPACA_ALLOW_LIVE_TRADING = "true";
    const cap = captureFetch();
    cap.install();

    const fetch = await directResolver.resolve("ALPACA_TEST");
    await fetch("https://paper-api.alpaca.markets/v2/orders", {
      method: "POST",
    });

    expect(cap.calls[0]?.url).toBe("https://api.alpaca.markets/v2/orders");
  });

  it("refuses a money-moving write on the live host without the allow flag", async () => {
    setCreds();
    process.env.ALPACA_TRADING_ENV = "live";
    // ALPACA_ALLOW_LIVE_TRADING intentionally unset.
    const cap = captureFetch();
    cap.install();

    const fetch = await directResolver.resolve("ALPACA_TEST");
    await expect(
      fetch("https://paper-api.alpaca.markets/v2/orders", { method: "POST" }),
    ).rejects.toThrow(/live trading is not enabled/i);
    // The request must never reach the network.
    expect(cap.calls).toHaveLength(0);
  });

  it("allows reads on the live host without the allow flag", async () => {
    setCreds();
    process.env.ALPACA_TRADING_ENV = "live";
    const cap = captureFetch();
    cap.install();

    const fetch = await directResolver.resolve("ALPACA_TEST");
    await fetch("https://paper-api.alpaca.markets/v2/account");

    expect(cap.calls[0]?.url).toBe("https://api.alpaca.markets/v2/account");
  });
});
