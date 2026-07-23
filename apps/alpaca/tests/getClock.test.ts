import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it, vi } from "vitest";

import definition from "../scripts/getClock.ts";

function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const CLOCK = {
  timestamp: "2026-07-16T10:00:00-04:00",
  is_open: true,
  next_open: "2026-07-17T09:30:00-04:00",
  next_close: "2026-07-16T16:00:00-04:00",
};

describe("getClock: run", () => {
  it("GETs /v2/clock on the paper host and returns the clock", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url: String(url), init });
      return res(CLOCK);
    });

    const input = definition.inputSchema.parse({});
    const { data } = await definition.run(input, { fetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://paper-api.alpaca.markets/v2/clock");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.is_open).toBe(true);
    expect(data.next_open).toBe("2026-07-17T09:30:00-04:00");
  });

  it("throws a ConnectorHttpError on a 401", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () => res({ message: "unauthorized" }, 401));

    const input = definition.inputSchema.parse({});
    const err = await definition.run(input, { fetch }).catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
  });
});
