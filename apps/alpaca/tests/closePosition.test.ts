import { describe, expect, it, vi } from "vitest";

import definition from "../scripts/closePosition.ts";

function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const ORDER = {
  id: "61e69015-8549-4bfd-b9c3-01e75843f47d",
  symbol: "AAPL",
  side: "sell",
  status: "pending_new",
  qty: "10",
};

describe("closePosition", () => {
  it("DELETEs /v2/positions/{symbol} and returns the liquidating order", async () => {
    const calls: Array<{ url: string | URL | Request; init?: RequestInit }> =
      [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url, init });
      return res(ORDER);
    });

    const input = definition.inputSchema.parse({ symbol_or_asset_id: "AAPL" });
    const { data } = await definition.run(input, { fetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://paper-api.alpaca.markets/v2/positions/AAPL",
    );
    expect(calls[0]?.init?.method).toBe("DELETE");
    expect(data.id).toBe("61e69015-8549-4bfd-b9c3-01e75843f47d");
  });

  it("rejects on a 4xx", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () => res({ message: "position not found" }, 422));

    const input = definition.inputSchema.parse({ symbol_or_asset_id: "AAPL" });
    await expect(definition.run(input, { fetch })).rejects.toThrow();
  });

  it("puts qty in the query for a partial liquidation", async () => {
    const calls: Array<{ url: string | URL | Request; init?: RequestInit }> =
      [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url, init });
      return res(ORDER);
    });

    const input = definition.inputSchema.parse({
      symbol_or_asset_id: "AAPL",
      qty: "5",
    });
    await definition.run(input, { fetch });

    expect(calls[0]?.url).toBe(
      "https://paper-api.alpaca.markets/v2/positions/AAPL?qty=5",
    );
  });

  it("rejects supplying both qty and percentage", () => {
    expect(() =>
      definition.inputSchema.parse({
        symbol_or_asset_id: "AAPL",
        qty: "5",
        percentage: "50",
      }),
    ).toThrow(/at most one of qty or percentage/i);
  });
});
