import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it, vi } from "vitest";

import definition from "../scripts/listOptionContracts.ts";

function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const BODY = {
  option_contracts: [
    {
      id: "cf1a0c8e-3d7b-4d0e-8b6c-1a2b3c4d5e6f",
      symbol: "AAPL241220C00150000",
      name: "AAPL Dec 20 2024 150 Call",
      status: "active",
      tradable: true,
      expiration_date: "2024-12-20",
      root_symbol: "AAPL",
      underlying_symbol: "AAPL",
      type: "call" as const,
      style: "american" as const,
      strike_price: "150",
      multiplier: "100",
      size: "100",
      open_interest: "1234",
      close_price: "5.25",
    },
  ],
  next_page_token: null,
};

describe("listOptionContracts: run", () => {
  it("GETs /v2/options/contracts on the paper host and returns option_contracts", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url: String(url), init });
      return res(BODY);
    });

    const input = definition.inputSchema.parse({
      underlying_symbols: "AAPL,TSLA",
    });
    const { data } = await definition.run(input, { fetch });

    const url = new URL(calls[0]?.url ?? "");
    expect(url.origin + url.pathname).toBe(
      "https://paper-api.alpaca.markets/v2/options/contracts",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.option_contracts?.[0]?.symbol).toBe("AAPL241220C00150000");
  });

  it("puts underlying_symbols and the default limit into the query string", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url: String(url), init });
      return res(BODY);
    });

    const input = definition.inputSchema.parse({
      underlying_symbols: "AAPL,TSLA",
    });
    await definition.run(input, { fetch });

    const url = new URL(calls[0]?.url ?? "");
    expect(url.searchParams.get("underlying_symbols")).toBe("AAPL,TSLA");
    // limit is not schema-defaulted; the run() applies `?? 20` on the wire.
    expect(url.searchParams.get("limit")).toBe("20");
  });

  it("throws a ConnectorHttpError on a 400", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () => res({ message: "bad request" }, 400));

    const input = definition.inputSchema.parse({});
    const err = await definition.run(input, { fetch }).catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
