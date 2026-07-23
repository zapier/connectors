import { describe, expect, it, vi } from "vitest";

import definition from "../scripts/getWatchlistByName.ts";

function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const WATCHLIST = {
  id: "wl-1",
  name: "Tech",
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

describe("getWatchlistByName", () => {
  it("GETs /v2/watchlists:by_name with the name in the query", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async (url, init) => {
        calls.push({ url, init });
        return res(WATCHLIST);
      },
    );

    const input = definition.inputSchema.parse({ name: "Tech" });
    const { data } = await definition.run(input, {
      fetch: fetch as typeof globalThis.fetch,
    });

    const url = new URL(calls[0]?.url ?? "");
    expect(url.origin + url.pathname).toBe(
      "https://paper-api.alpaca.markets/v2/watchlists:by_name",
    );
    expect(url.searchParams.get("name")).toBe("Tech");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.id).toBe("wl-1");
    expect(data.name).toBe("Tech");
  });

  it("rejects on a 4xx error", async () => {
    const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async () => res({ message: "watchlist not found" }, 404),
    );

    const input = definition.inputSchema.parse({ name: "Nope" });
    await expect(
      definition.run(input, { fetch: fetch as typeof globalThis.fetch }),
    ).rejects.toThrow();
  });

  it("URL-encodes a name with spaces in the query", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async (url, init) => {
        calls.push({ url, init });
        return res(WATCHLIST);
      },
    );

    const input = definition.inputSchema.parse({ name: "My List" });
    await definition.run(input, { fetch: fetch as typeof globalThis.fetch });

    expect(calls[0]?.url).toContain("name=My+List");
    expect(new URL(calls[0]?.url ?? "").searchParams.get("name")).toBe(
      "My List",
    );
  });
});
