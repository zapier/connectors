import { describe, expect, it, vi } from "vitest";

import definition from "../scripts/getPortfolioHistory.ts";

function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Portfolio history is the ONE Alpaca endpoint that returns JSON numbers (not
// strings): parallel numeric arrays plus a numeric base_value.
const HISTORY = {
  timestamp: [1656691200, 1656777600, 1656864000],
  equity: [50000.0, 50250.5, 49875.25],
  profit_loss: [0, 250.5, -124.75],
  profit_loss_pct: [0, 0.00501, -0.00248],
  base_value: 50000.0,
  timeframe: "1D",
};

describe("getPortfolioHistory", () => {
  it("GETs /v2/account/portfolio/history with query params and returns the series", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url: String(url), init });
      return res(HISTORY);
    });

    const input = definition.inputSchema.parse({
      period: "1M",
      timeframe: "1D",
    });
    const { data } = await definition.run(input, { fetch });

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]?.url as string);
    expect(url.origin + url.pathname).toBe(
      "https://paper-api.alpaca.markets/v2/account/portfolio/history",
    );
    expect(url.searchParams.get("period")).toBe("1M");
    expect(url.searchParams.get("timeframe")).toBe("1D");
    expect(calls[0]?.init?.method).toBe("GET");

    expect(Array.isArray(data.equity)).toBe(true);
    expect(data.equity?.every((v) => typeof v === "number")).toBe(true);
    expect(data.equity).toEqual([50000.0, 50250.5, 49875.25]);
  });

  it("returns base_value as a number (not a string)", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () => res(HISTORY));

    const input = definition.inputSchema.parse({ period: "1M" });
    const { data } = await definition.run(input, { fetch });

    expect(typeof data.base_value).toBe("number");
    expect(data.base_value).toBe(50000.0);
    expect(typeof data.profit_loss?.[1]).toBe("number");
  });

  it("rejects on a 4xx", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () => res({ message: "invalid period" }, 422));

    const input = definition.inputSchema.parse({ period: "bogus" });
    await expect(definition.run(input, { fetch })).rejects.toThrow();
  });
});
