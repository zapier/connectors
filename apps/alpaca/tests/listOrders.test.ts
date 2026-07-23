import { describe, expect, it, vi } from "vitest";

import definition from "../scripts/listOrders.ts";

function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const ORDERS = [
  { id: "order-1", symbol: "AAPL", side: "buy", status: "filled" },
  { id: "order-2", symbol: "TSLA", side: "sell", status: "new" },
];

describe("listOrders: run", () => {
  it("GETs /v2/orders and wraps the array in orders", async () => {
    const calls: Array<{ url: string | URL | Request; init?: RequestInit }> =
      [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url, init });
      return res(ORDERS);
    });

    const input = definition.inputSchema.parse({ status: "open" });
    const { data } = await definition.run(input, { fetch });

    expect(calls).toHaveLength(1);
    const url = new URL(String(calls[0]!.url));
    expect(url.origin + url.pathname).toBe(
      "https://paper-api.alpaca.markets/v2/orders",
    );
    expect(url.searchParams.get("status")).toBe("open");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.orders).toEqual(ORDERS);
  });

  it("applies the default limit=20 when omitted", async () => {
    const calls: Array<{ url: string | URL | Request; init?: RequestInit }> =
      [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url, init });
      return res(ORDERS);
    });

    const input = definition.inputSchema.parse({});
    await definition.run(input, { fetch });

    expect(String(calls[0]?.url)).toContain("limit=20");
  });

  it("throws on a 403 error response", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () =>
      res({ code: 40310000, message: "insufficient buying power" }, 403),
    );
    const input = definition.inputSchema.parse({});
    await expect(definition.run(input, { fetch })).rejects.toThrow();
  });
});
