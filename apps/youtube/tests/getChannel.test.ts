import { describe, expect, it } from "vitest";

import getChannelDefinition from "../scripts/getChannel.ts";

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

describe("getChannel: happy path", () => {
  it("GETs /channels with part + mine and parses against outputSchema", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        items: [
          {
            id: "UCuAXFkgsw1L7xaCfnd5JJOw",
            snippet: {
              title: "Rick Astley",
              description: "Official channel.",
              customUrl: "@RickAstleyYT",
              publishedAt: "2009-10-25T06:57:33Z",
              country: "GB",
            },
            contentDetails: {
              relatedPlaylists: { uploads: "UUuAXFkgsw1L7xaCfnd5JJOw" },
            },
            statistics: {
              viewCount: "1000000",
              subscriberCount: "5000000",
              hiddenSubscriberCount: false,
              videoCount: "200",
            },
          },
        ],
      });
    }) as typeof globalThis.fetch;

    const { data } = await getChannelDefinition.run(
      getChannelDefinition.inputSchema.parse({ mine: true }),
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe("GET");
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/youtube/v3/channels");
    expect(url.searchParams.get("mine")).toBe("true");
    expect(url.searchParams.get("part")).toBe(
      "snippet,contentDetails,statistics,brandingSettings",
    );
    expect(data.items).toHaveLength(1);
    expect(getChannelDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });
});

describe("getChannel: error path", () => {
  it("rejects on a non-2xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 404,
            message: "the resource does not exist",
            errors: [{ reason: "notFound" }],
          },
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getChannelDefinition
      .run(getChannelDefinition.inputSchema.parse({ id: "UCdoesnotexist" }), {
        fetch: fakeFetch,
      })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
  });
});

describe("getChannel: query mapping", () => {
  it("sets mine=true in the query when mine is passed", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ items: [] });
    }) as typeof globalThis.fetch;

    await getChannelDefinition.run(
      getChannelDefinition.inputSchema.parse({ mine: true }),
      { fetch: fakeFetch },
    );

    const url = new URL(calls[0]!.url);
    expect(url.searchParams.get("mine")).toBe("true");
    expect(url.searchParams.has("id")).toBe(false);
    expect(url.searchParams.has("forHandle")).toBe(false);
  });
});
