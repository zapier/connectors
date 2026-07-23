import { describe, expect, it, vi } from "vitest";

import definition from "../scripts/closeAllPositions.ts";

function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const RESULTS = [
  {
    symbol: "AAPL",
    status: 200,
    body: {
      id: "61e69015-8549-4bfd-b9c3-01e75843f47d",
      symbol: "AAPL",
      side: "sell",
      status: "pending_new",
    },
  },
];

describe("closeAllPositions", () => {
  it("DELETEs /v2/positions and wraps the multi-status array", async () => {
    const calls: Array<{ url: string | URL | Request; init?: RequestInit }> =
      [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url, init });
      return res(RESULTS);
    });

    const input = definition.inputSchema.parse({});
    const { data } = await definition.run(input, { fetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://paper-api.alpaca.markets/v2/positions");
    expect(calls[0]?.init?.method).toBe("DELETE");
    expect(data.results).toEqual(RESULTS);
  });

  it("rejects on a 4xx", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () => res({ message: "forbidden" }, 403));

    const input = definition.inputSchema.parse({});
    await expect(definition.run(input, { fetch })).rejects.toThrow();
  });

  it("passes cancel_orders in the query when set", async () => {
    const calls: Array<{ url: string | URL | Request; init?: RequestInit }> =
      [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url, init });
      return res(RESULTS);
    });

    const input = definition.inputSchema.parse({ cancel_orders: true });
    await definition.run(input, { fetch });

    expect(calls[0]?.url).toBe(
      "https://paper-api.alpaca.markets/v2/positions?cancel_orders=true",
    );
  });
});
