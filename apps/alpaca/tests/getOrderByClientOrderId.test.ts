import { describe, expect, it, vi } from "vitest";

import definition from "../scripts/getOrderByClientOrderId.ts";

function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const ORDER = {
  id: "order-abc",
  client_order_id: "my-client-id-1",
  symbol: "AAPL",
  side: "buy",
  status: "new",
};

describe("getOrderByClientOrderId: run", () => {
  it("GETs /v2/orders:by_client_order_id with the client_order_id query", async () => {
    const calls: Array<{ url: string | URL | Request; init?: RequestInit }> =
      [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url, init });
      return res(ORDER);
    });

    const input = definition.inputSchema.parse({
      client_order_id: "my-client-id-1",
    });
    const { data } = await definition.run(input, { fetch });

    expect(calls).toHaveLength(1);
    const url = new URL(String(calls[0]!.url));
    expect(url.origin + url.pathname).toBe(
      "https://paper-api.alpaca.markets/v2/orders:by_client_order_id",
    );
    expect(url.searchParams.get("client_order_id")).toBe("my-client-id-1");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.id).toBe("order-abc");
    expect(data.client_order_id).toBe("my-client-id-1");
  });

  it("throws a not-found error on 404", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () => res({}, 404));
    const input = definition.inputSchema.parse({ client_order_id: "missing" });
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
    const input = definition.inputSchema.parse({
      client_order_id: "my-client-id-1",
    });
    await expect(definition.run(input, { fetch })).rejects.toThrow();
  });
});
