import { describe, expect, it, vi } from "vitest";

import definition from "../scripts/getAccount.ts";

function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const ACCOUNT = {
  id: "e6c2b1a0-4f3d-4c2b-9a1e-0f1d2c3b4a5e",
  account_number: "PA3XYZ123",
  status: "ACTIVE",
  currency: "USD",
  cash: "50000.00",
  buying_power: "100000.50",
  equity: "50000.00",
  daytrade_count: 0,
  pattern_day_trader: false,
};

describe("getAccount", () => {
  it("GETs /v2/account on the paper host and returns the account", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url: String(url), init });
      return res(ACCOUNT);
    });

    const input = definition.inputSchema.parse({});
    const { data } = await definition.run(input, { fetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://paper-api.alpaca.markets/v2/account");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.id).toBe("e6c2b1a0-4f3d-4c2b-9a1e-0f1d2c3b4a5e");
    expect(data.buying_power).toBe("100000.50");
  });

  it("keeps monetary fields as strings (no numeric coercion)", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () => res(ACCOUNT));

    const input = definition.inputSchema.parse({});
    const { data } = await definition.run(input, { fetch });

    expect(typeof data.buying_power).toBe("string");
    expect(data.buying_power).toBe("100000.50");
    expect(typeof data.cash).toBe("string");
  });

  it("rejects on a 4xx", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () => res({ message: "forbidden" }, 403));

    const input = definition.inputSchema.parse({});
    await expect(definition.run(input, { fetch })).rejects.toThrow();
  });
});
