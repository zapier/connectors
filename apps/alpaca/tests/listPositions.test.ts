import { describe, expect, it, vi } from "vitest";

import definition from "../scripts/listPositions.ts";

function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const POSITION = {
  asset_id: "b0b6dd9d-8b9b-48a9-ba46-b9d54906e415",
  symbol: "AAPL",
  qty: "10",
  side: "long",
  market_value: "1500.00",
  cost_basis: "1400.00",
  unrealized_pl: "100.00",
};

describe("listPositions", () => {
  it("GETs /v2/positions on the paper host and wraps the bare array", async () => {
    const calls: Array<{ url: string | URL | Request; init?: RequestInit }> =
      [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url, init });
      return res([POSITION]);
    });

    const input = definition.inputSchema.parse({});
    const { data } = await definition.run(input, { fetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://paper-api.alpaca.markets/v2/positions");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.positions).toEqual([POSITION]);
  });

  it("rejects on a 4xx", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () => res({ message: "forbidden" }, 403));

    const input = definition.inputSchema.parse({});
    await expect(definition.run(input, { fetch })).rejects.toThrow();
  });

  it("returns an empty positions array when nothing is held", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () => res([]));

    const input = definition.inputSchema.parse({});
    const { data } = await definition.run(input, { fetch });

    expect(data.positions).toEqual([]);
  });
});
