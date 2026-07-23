import { describe, expect, it, vi } from "vitest";

import definition from "../scripts/getAccountConfigurations.ts";

function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const CONFIG = {
  trade_confirm_email: "all",
  suspend_trade: false,
  no_shorting: false,
  fractional_trading: true,
  max_margin_multiplier: "4",
  max_options_trading_level: 2,
  ptp_no_exception_entry: false,
  disable_overnight_trading: false,
};

describe("getAccountConfigurations", () => {
  it("GETs /v2/account/configurations on the paper host and returns the flags", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url: String(url), init });
      return res(CONFIG);
    });

    const input = definition.inputSchema.parse({});
    const { data } = await definition.run(input, { fetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://paper-api.alpaca.markets/v2/account/configurations",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.no_shorting).toBe(false);
    expect(data.fractional_trading).toBe(true);
    expect(data.trade_confirm_email).toBe("all");
  });

  it("rejects on a 4xx", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () => res({ message: "unauthorized" }, 401));

    const input = definition.inputSchema.parse({});
    await expect(definition.run(input, { fetch })).rejects.toThrow();
  });
});
