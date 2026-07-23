import { describe, expect, it, vi } from "vitest";

import definition from "../scripts/getWatchlist.ts";

function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const WATCHLIST = {
  id: "wl-1",
  name: "Tech",
  account_id: "acct-1",
  assets: [
    {
      id: "asset-1",
      class: "us_equity",
      symbol: "AAPL",
      status: "active" as const,
      tradable: true,
    },
  ],
};

describe("getWatchlist", () => {
  it("GETs /v2/watchlists/{id} on the paper host and returns the watchlist with assets", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async (url, init) => {
        calls.push({ url, init });
        return res(WATCHLIST);
      },
    );

    const input = definition.inputSchema.parse({ watchlist_id: "wl-1" });
    const { data } = await definition.run(input, {
      fetch: fetch as typeof globalThis.fetch,
    });

    expect(calls[0]?.url).toBe(
      "https://paper-api.alpaca.markets/v2/watchlists/wl-1",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.id).toBe("wl-1");
    expect(data.name).toBe("Tech");
    expect(data.assets?.[0]?.symbol).toBe("AAPL");
  });

  it("rejects on a 4xx error", async () => {
    const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async () => res({ message: "watchlist not found" }, 404),
    );

    const input = definition.inputSchema.parse({ watchlist_id: "missing" });
    await expect(
      definition.run(input, { fetch: fetch as typeof globalThis.fetch }),
    ).rejects.toThrow();
  });

  it("URL-encodes the watchlist id into the path", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async (url, init) => {
        calls.push({ url, init });
        return res(WATCHLIST);
      },
    );

    const input = definition.inputSchema.parse({ watchlist_id: "a b/c" });
    await definition.run(input, { fetch: fetch as typeof globalThis.fetch });

    expect(calls[0]?.url).toBe(
      "https://paper-api.alpaca.markets/v2/watchlists/a%20b%2Fc",
    );
  });
});
