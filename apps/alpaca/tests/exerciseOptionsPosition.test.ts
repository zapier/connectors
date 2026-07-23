import { describe, expect, it, vi } from "vitest";

import definition from "../scripts/exerciseOptionsPosition.ts";

function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("exerciseOptionsPosition", () => {
  it("POSTs to /v2/positions/{symbol}/exercise and synthesizes the ack", async () => {
    const calls: Array<{ url: string | URL | Request; init?: RequestInit }> =
      [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url, init });
      return res("", 200);
    });

    const input = definition.inputSchema.parse({
      symbol_or_contract_id: "AAPL240119C00150000",
    });
    const { data } = await definition.run(input, { fetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://paper-api.alpaca.markets/v2/positions/AAPL240119C00150000/exercise",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(data).toEqual({
      symbol_or_contract_id: "AAPL240119C00150000",
      exercise_requested: true,
    });
  });

  it("rejects on a 4xx", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () => res({ message: "no such position" }, 422));

    const input = definition.inputSchema.parse({
      symbol_or_contract_id: "AAPL240119C00150000",
    });
    await expect(definition.run(input, { fetch })).rejects.toThrow();
  });

  it("synthesizes the ack without reading the empty response body", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(
      async () =>
        new Response(null, { status: 200, headers: { "content-length": "0" } }),
    );

    const input = definition.inputSchema.parse({
      symbol_or_contract_id: "contract-uuid-123",
    });
    const { data } = await definition.run(input, { fetch });

    expect(data).toEqual({
      symbol_or_contract_id: "contract-uuid-123",
      exercise_requested: true,
    });
  });

  it("maps a rejection to an actionable market-hours hint", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () => res({ message: "exercise not allowed" }, 403));

    const input = definition.inputSchema.parse({
      symbol_or_contract_id: "AAPL240119C00150000",
    });
    await expect(definition.run(input, { fetch })).rejects.toThrow(
      /market close and midnight|market hours/i,
    );
  });
});
