import { describe, expect, it, vi } from "vitest";

import definition from "../scripts/listWatchlists.ts";

function res(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const WATCHLISTS = [
  {
    id: "wl-1",
    name: "Tech",
    account_id: "acct-1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
  },
  { id: "wl-2", name: "Energy" },
];

describe("listWatchlists", () => {
  it("GETs /v2/watchlists on the paper host and wraps the bare array", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async (url, init) => {
        calls.push({ url, init });
        return res(WATCHLISTS);
      },
    );

    const input = definition.inputSchema.parse({});
    const { data } = await definition.run(input, {
      fetch: fetch as typeof globalThis.fetch,
    });

    expect(calls[0]?.url).toBe(
      "https://paper-api.alpaca.markets/v2/watchlists",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.watchlists).toEqual(WATCHLISTS);
    expect(data.watchlists[0]?.id).toBe("wl-1");
    expect(data.watchlists[0]?.name).toBe("Tech");
  });

  it("rejects on a 4xx error", async () => {
    const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async () => res({ message: "forbidden" }, 403),
    );

    const input = definition.inputSchema.parse({});
    await expect(
      definition.run(input, { fetch: fetch as typeof globalThis.fetch }),
    ).rejects.toThrow();
  });

  it("wraps an empty array as an empty watchlists list", async () => {
    const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async () => res([]),
    );

    const input = definition.inputSchema.parse({});
    const { data } = await definition.run(input, {
      fetch: fetch as typeof globalThis.fetch,
    });

    expect(data.watchlists).toEqual([]);
  });
});
