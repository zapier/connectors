import { describe, expect, it, vi } from "vitest";

import definition from "../scripts/getPosition.ts";

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
  avg_entry_price: "140.00",
};

describe("getPosition", () => {
  it("GETs /v2/positions/{symbol} and returns the position", async () => {
    const calls: Array<{ url: string | URL | Request; init?: RequestInit }> =
      [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url, init });
      return res(POSITION);
    });

    const input = definition.inputSchema.parse({ symbol_or_asset_id: "AAPL" });
    const { data } = await definition.run(input, { fetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://paper-api.alpaca.markets/v2/positions/AAPL",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.symbol).toBe("AAPL");
    expect(data.qty).toBe("10");
  });

  it("maps a 404 to a clean 'no open position' rejection", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () => res({}, 404));

    const input = definition.inputSchema.parse({ symbol_or_asset_id: "TSLA" });
    await expect(definition.run(input, { fetch })).rejects.toThrow(
      /no open position|404|none/i,
    );
  });

  it("URL-encodes the slash in a crypto pair symbol", async () => {
    const calls: Array<{ url: string | URL | Request; init?: RequestInit }> =
      [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url, init });
      return res({ ...POSITION, symbol: "BTC/USD", asset_class: "crypto" });
    });

    const input = definition.inputSchema.parse({
      symbol_or_asset_id: "BTC/USD",
    });
    await definition.run(input, { fetch });

    expect(calls[0]?.url).toBe(
      "https://paper-api.alpaca.markets/v2/positions/BTC%2FUSD",
    );
  });
});
