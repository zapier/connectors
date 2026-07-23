import { describe, expect, it, vi } from "vitest";

import definition from "../scripts/cancelAllOrders.ts";

function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const RESULTS = [
  { id: "order-1", status: 200 },
  { id: "order-2", status: 500 },
];

describe("cancelAllOrders: run", () => {
  it("DELETEs /v2/orders and wraps the per-order array in results", async () => {
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
    expect(calls[0]?.url).toBe("https://paper-api.alpaca.markets/v2/orders");
    expect(calls[0]?.init?.method).toBe("DELETE");
    expect(data.results).toEqual(RESULTS);
  });

  it("returns an empty results array when nothing was open", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () => res([]));
    const input = definition.inputSchema.parse({});
    const { data } = await definition.run(input, { fetch });
    expect(data.results).toEqual([]);
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
