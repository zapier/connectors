import { describe, expect, it, vi } from "vitest";

import definition from "../scripts/listAccountActivities.ts";

function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// The Alpaca endpoint returns a bare array; the script wraps it in { activities }.
const ACTIVITIES = [
  {
    id: "20220701000000000::abc", // pii:allow
    activity_type: "FILL",
    transaction_time: "2022-07-01T14:30:00Z",
    type: "fill",
    symbol: "AAPL",
    side: "buy",
    qty: "10",
    price: "140.00",
    net_amount: "-1400.00",
  },
  {
    id: "20220701000000000::def", // pii:allow
    activity_type: "DIV",
    date: "2022-07-01",
    net_amount: "3.21",
    symbol: "AAPL",
    description: "Cash dividend",
  },
];

describe("listAccountActivities", () => {
  it("GETs /v2/account/activities and wraps the bare array under activities", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url: String(url), init });
      return res(ACTIVITIES);
    });

    const input = definition.inputSchema.parse({ activity_types: "FILL,DIV" });
    const { data } = await definition.run(input, { fetch });

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]?.url as string);
    expect(url.origin + url.pathname).toBe(
      "https://paper-api.alpaca.markets/v2/account/activities",
    );
    expect(url.searchParams.get("activity_types")).toBe("FILL,DIV");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.activities).toEqual(ACTIVITIES);
  });

  it("applies the default page_size of 20 when omitted", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async (url, init) => {
      calls.push({ url: String(url), init });
      return res([]);
    });

    const input = definition.inputSchema.parse({});
    const { data } = await definition.run(input, { fetch });

    const url = new URL(calls[0]?.url as string);
    expect(url.searchParams.get("page_size")).toBe("20");
    expect(data.activities).toEqual([]);
  });

  it("rejects on a 4xx", async () => {
    const fetch = vi.fn<
      (url: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(async () => res({ message: "bad request" }, 400));

    const input = definition.inputSchema.parse({ date: "not-a-date" });
    await expect(definition.run(input, { fetch })).rejects.toThrow();
  });

  it("rejects supplying both activity_types and category", () => {
    expect(() =>
      definition.inputSchema.parse({
        activity_types: "FILL",
        category: "trade_activity",
      }),
    ).toThrow(/either activity_types or category/i);
  });
});
