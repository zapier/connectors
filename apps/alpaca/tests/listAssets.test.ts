import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it, vi } from "vitest";

import definition from "../scripts/listAssets.ts";

function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const ASSETS = [
  {
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
  },
];

describe("listAssets: run", () => {
  it("GETs /v2/assets on the paper host and wraps the bare array as data.assets", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url: String(url), init });
      return res(ASSETS);
    });

    const input = definition.inputSchema.parse({});
    const { data } = await definition.run(input, { fetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://paper-api.alpaca.markets/v2/assets");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.assets).toEqual(ASSETS);
    expect(data.assets[0]?.symbol).toBe("AAPL");
  });

  it("puts an asset_class filter into the query string", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url: String(url), init });
      return res([]);
    });

    const input = definition.inputSchema.parse({
      asset_class: "crypto",
      status: "active",
    });
    await definition.run(input, { fetch });

    const url = new URL(calls[0]?.url ?? "");
    expect(url.searchParams.get("asset_class")).toBe("crypto");
    expect(url.searchParams.get("status")).toBe("active");
  });

  it("throws a ConnectorHttpError on a 4xx", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () => res({ message: "forbidden" }, 403));

    const input = definition.inputSchema.parse({});
    const err = await definition.run(input, { fetch }).catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
