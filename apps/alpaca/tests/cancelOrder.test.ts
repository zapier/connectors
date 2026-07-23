import { describe, expect, it, vi } from "vitest";

import definition from "../scripts/cancelOrder.ts";

function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("cancelOrder: run", () => {
  it("DELETEs /v2/orders/{order_id} and synthesizes a canceled result", async () => {
    const calls: Array<{ url: string | URL | Request; init?: RequestInit }> =
      [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url, init });
      return res(null, 200);
    });

    const input = definition.inputSchema.parse({ order_id: "order-123" });
    const { data } = await definition.run(input, { fetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://paper-api.alpaca.markets/v2/orders/order-123",
    );
    expect(calls[0]?.init?.method).toBe("DELETE");
    expect(data).toEqual({ order_id: "order-123", canceled: true });
  });

  it("synthesizes the result without reading the response body (empty 204)", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () => new Response(null, { status: 204 }));
    const input = definition.inputSchema.parse({ order_id: "order-456" });
    const { data } = await definition.run(input, { fetch });
    expect(data).toEqual({ order_id: "order-456", canceled: true });
  });

  it("throws on a 422 (order already filled/done)", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () =>
      res({ code: 42210000, message: "order is not cancelable" }, 422),
    );
    const input = definition.inputSchema.parse({ order_id: "order-123" });
    await expect(definition.run(input, { fetch })).rejects.toThrow();
  });
});
