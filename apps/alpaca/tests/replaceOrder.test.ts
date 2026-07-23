import { describe, expect, it, vi } from "vitest";

import definition from "../scripts/replaceOrder.ts";

function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const ORDER = {
  id: "new-order-id-0001",
  symbol: "AAPL",
  side: "buy",
  status: "accepted",
  qty: "2",
  replaces: "old-order-id-0001",
};

describe("replaceOrder: run", () => {
  it("PATCHes /v2/orders/{order_id} with the new fields", async () => {
    const calls: Array<{ url: string | URL | Request; init?: RequestInit }> =
      [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url, init });
      return res(ORDER);
    });

    const input = definition.inputSchema.parse({
      order_id: "old-order-id-0001",
      qty: "2",
    });
    const { data } = await definition.run(input, { fetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://paper-api.alpaca.markets/v2/orders/old-order-id-0001",
    );
    expect(calls[0]?.init?.method).toBe("PATCH");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      qty: "2",
    });
    expect(data.id).toBe(ORDER.id);
    expect(data.status).toBe("accepted");
  });

  it("URL-encodes the order id in the path", async () => {
    const calls: Array<{ url: string | URL | Request; init?: RequestInit }> =
      [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url, init });
      return res(ORDER);
    });

    const input = definition.inputSchema.parse({
      order_id: "abc/def",
      limit_price: "10.50",
    });
    await definition.run(input, { fetch });

    expect(calls[0]?.url).toBe(
      "https://paper-api.alpaca.markets/v2/orders/abc%2Fdef",
    );
  });

  it("throws on a 403 rejection", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () =>
      res({ code: 40310000, message: "insufficient buying power" }, 403),
    );
    const input = definition.inputSchema.parse({
      order_id: "old-order-id-0001",
      qty: "2",
    });
    await expect(definition.run(input, { fetch })).rejects.toThrow();
  });
});
