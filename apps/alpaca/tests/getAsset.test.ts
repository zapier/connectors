import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it, vi } from "vitest";

import definition from "../scripts/getAsset.ts";

function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const ASSET = {
  id: "b0b6dd9d-8b9b-48a9-ba46-b9d54906e415",
  class: "us_equity",
  exchange: "NASDAQ",
  symbol: "AAPL",
  name: "Apple Inc. Common Stock",
  status: "active" as const,
  tradable: true,
  marginable: true,
  shortable: true,
  fractionable: true,
};

describe("getAsset: run", () => {
  it("GETs /v2/assets/{symbol} on the paper host and returns the asset", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url: String(url), init });
      return res(ASSET);
    });

    const input = definition.inputSchema.parse({ symbol_or_asset_id: "AAPL" });
    const { data } = await definition.run(input, { fetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://paper-api.alpaca.markets/v2/assets/AAPL",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.symbol).toBe("AAPL");
    expect(data.tradable).toBe(true);
  });

  it("URL-encodes the slash in a crypto pair", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url: String(url), init });
      return res({ ...ASSET, class: "crypto", symbol: "BTC/USD" });
    });

    const input = definition.inputSchema.parse({
      symbol_or_asset_id: "BTC/USD",
    });
    await definition.run(input, { fetch });

    expect(calls[0]?.url).toBe(
      "https://paper-api.alpaca.markets/v2/assets/BTC%2FUSD",
    );
  });

  it("throws a ConnectorHttpError on a 404", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () => res({ message: "asset not found" }, 404));

    const input = definition.inputSchema.parse({
      symbol_or_asset_id: "NOPE",
    });
    const err = await definition.run(input, { fetch }).catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
