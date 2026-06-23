import { describe, expect, it } from "vitest";

import listSubscriptionsDefinition from "../scripts/listSubscriptions.ts";

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

describe("listSubscriptions: happy path", () => {
  it("builds the subscriptions URL with mine + part, renames nextPageToken, and parses", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return jsonResponse({
        items: [
          {
            id: "sub1",
            snippet: {
              title: "Rick Astley",
              description: "Official channel.",
              publishedAt: "2020-01-01T00:00:00Z",
              resourceId: {
                kind: "youtube#channel",
                channelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
              },
            },
            contentDetails: { totalItemCount: 120, newItemCount: 3 },
          },
        ],
        nextPageToken: "CABC",
      });
    }) as typeof globalThis.fetch;

    const { data } = await listSubscriptionsDefinition.run(
      { part: "snippet,contentDetails", mine: true, order: "relevance" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("/youtube/v3/subscriptions");
    expect(calls[0]).toContain("mine=true");
    expect(calls[0]).toContain("part=snippet");
    expect(data.items).toHaveLength(1);
    expect(data.next_page_token).toBe("CABC");
    expect(
      listSubscriptionsDefinition.outputSchema.safeParse(data).success,
    ).toBe(true);
  });
});

describe("listSubscriptions: error path", () => {
  it("rejects on a 403", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 403,
            message: "Quota exceeded.",
            errors: [{ reason: "quotaExceeded" }],
          },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    await expect(
      listSubscriptionsDefinition.run(
        { part: "snippet,contentDetails", mine: true, order: "relevance" },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow();
  });
});

describe("listSubscriptions: transform", () => {
  it("preserves the nested resourceId.channelId through parse", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        items: [
          {
            id: "sub1",
            snippet: {
              resourceId: {
                kind: "youtube#channel",
                channelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
              },
            },
          },
        ],
      })) as typeof globalThis.fetch;

    const { data } = await listSubscriptionsDefinition.run(
      { part: "snippet,contentDetails", mine: true, order: "relevance" },
      { fetch: fakeFetch },
    );

    const parsed = listSubscriptionsDefinition.outputSchema.parse(data);
    expect(parsed.items[0]?.id).toBe("sub1");
    expect(parsed.items[0]?.snippet?.resourceId?.channelId).toBe(
      "UCuAXFkgsw1L7xaCfnd5JJOw",
    );
  });
});
