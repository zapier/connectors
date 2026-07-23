import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it, vi } from "vitest";

import definition from "../scripts/getMarketCalendar.ts";

function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const DAYS = [
  {
    date: "2026-07-16",
    open: "09:30",
    close: "16:00",
    settlement_date: "2026-07-17",
  },
  {
    date: "2026-07-17",
    open: "09:30",
    close: "16:00",
    settlement_date: "2026-07-20",
  },
];

describe("getMarketCalendar: run", () => {
  it("GETs /v2/calendar on the paper host and wraps the bare array as data.calendar", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url: String(url), init });
      return res(DAYS);
    });

    const input = definition.inputSchema.parse({});
    const { data } = await definition.run(input, { fetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://paper-api.alpaca.markets/v2/calendar");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.calendar).toEqual(DAYS);
  });

  it("puts the date range into the query string", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url: String(url), init });
      return res(DAYS);
    });

    const input = definition.inputSchema.parse({
      start: "2026-07-16",
      end: "2026-07-17",
    });
    await definition.run(input, { fetch });

    const url = new URL(calls[0]?.url ?? "");
    expect(url.searchParams.get("start")).toBe("2026-07-16");
    expect(url.searchParams.get("end")).toBe("2026-07-17");
  });

  it("throws a ConnectorHttpError on a 422", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () => res({ message: "invalid date" }, 422));

    const input = definition.inputSchema.parse({ start: "not-a-date" });
    const err = await definition.run(input, { fetch }).catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(422);
  });
});
