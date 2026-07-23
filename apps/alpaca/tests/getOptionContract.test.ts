import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it, vi } from "vitest";

import definition from "../scripts/getOptionContract.ts";

function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const CONTRACT = {
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
};

describe("getOptionContract: run", () => {
  it("GETs /v2/options/contracts/{symbol} on the paper host and returns the contract", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url: String(url), init });
      return res(CONTRACT);
    });

    const input = definition.inputSchema.parse({
      symbol_or_id: "AAPL241220C00150000",
    });
    const { data } = await definition.run(input, { fetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://paper-api.alpaca.markets/v2/options/contracts/AAPL241220C00150000",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.id).toBe("cf1a0c8e-3d7b-4d0e-8b6c-1a2b3c4d5e6f");
  });

  it("throws a ConnectorHttpError on a 404", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () => res({ message: "contract not found" }, 404));

    const input = definition.inputSchema.parse({
      symbol_or_id: "NOPE000000000",
    });
    const err = await definition.run(input, { fetch }).catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
