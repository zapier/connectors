import { describe, expect, it, vi } from "vitest";

import definition from "../scripts/getOrder.ts";

function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const ORDER = {
  id: "order-abc",
  symbol: "AAPL",
  side: "buy",
  status: "filled",
  filled_qty: "1",
};

describe("getOrder: run", () => {
  it("GETs /v2/orders/{order_id} and returns the parsed order", async () => {
    const calls: Array<{ url: string | URL | Request; init?: RequestInit }> =
      [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url, init });
      return res(ORDER);
    });

    const input = definition.inputSchema.parse({ order_id: "order-abc" });
    const { data } = await definition.run(input, { fetch });

    expect(calls).toHaveLength(1);
    const url = new URL(String(calls[0]!.url));
    expect(url.origin + url.pathname).toBe(
      "https://paper-api.alpaca.markets/v2/orders/order-abc",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.id).toBe("order-abc");
    expect(data.status).toBe("filled");
  });

  it("throws a not-found error on 404", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () => res({}, 404));
    const input = definition.inputSchema.parse({ order_id: "missing" });
    await expect(definition.run(input, { fetch })).rejects.toThrow(
      /not found/i,
    );
  });

  it("throws on a 403 error response", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () =>
      res({ code: 40310000, message: "insufficient buying power" }, 403),
    );
    const input = definition.inputSchema.parse({ order_id: "order-abc" });
    await expect(definition.run(input, { fetch })).rejects.toThrow();
  });
});
