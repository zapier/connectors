import { describe, expect, it, vi } from "vitest";

import definition from "../scripts/placeOrder.ts";

function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const ORDER = {
  id: "e1b2c3d4-0000-0000-0000-000000000001",
  symbol: "AAPL",
  side: "buy",
  status: "accepted",
  qty: "1",
  type: "market",
};

describe("placeOrder: inputSchema", () => {
  it("rejects qty and notional supplied together", () => {
    expect(
      definition.inputSchema.safeParse({
        symbol: "AAPL",
        side: "buy",
        qty: "1",
        notional: "100",
      }).success,
    ).toBe(false);
  });

  it("rejects a bracket order missing take_profit/stop_loss", () => {
    expect(
      definition.inputSchema.safeParse({
        symbol: "AAPL",
        side: "buy",
        qty: "1",
        order_class: "bracket",
      }).success,
    ).toBe(false);
  });

  it("accepts a market order with only qty", () => {
    expect(
      definition.inputSchema.safeParse({
        symbol: "AAPL",
        side: "buy",
        qty: "1",
      }).success,
    ).toBe(true);
  });

  it("rejects a limit order without a limit_price", () => {
    expect(
      definition.inputSchema.safeParse({
        symbol: "AAPL",
        side: "buy",
        qty: "1",
        type: "limit",
      }).success,
    ).toBe(false);
  });
});

describe("placeOrder: run", () => {
  it("POSTs to /v2/orders and returns the parsed order", async () => {
    const calls: Array<{ url: string | URL | Request; init?: RequestInit }> =
      [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url, init });
      return res(ORDER);
    });

    const input = definition.inputSchema.parse({
      symbol: "AAPL",
      side: "buy",
      qty: "1",
    });
    const { data } = await definition.run(input, { fetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://paper-api.alpaca.markets/v2/orders");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      symbol: "AAPL",
      side: "buy",
      qty: "1",
    });
    expect(data.id).toBe(ORDER.id);
    expect(data.status).toBe("accepted");
  });

  it("throws on a 403 rejection", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () =>
      res({ code: 40310000, message: "insufficient buying power" }, 403),
    );
    const input = definition.inputSchema.parse({
      symbol: "AAPL",
      side: "buy",
      qty: "1",
    });
    await expect(definition.run(input, { fetch })).rejects.toThrow();
  });
});
