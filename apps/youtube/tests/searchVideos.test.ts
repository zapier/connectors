import { describe, expect, it } from "vitest";

import searchVideosDefinition from "../scripts/searchVideos.ts";

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

describe("searchVideos: happy path", () => {
  it("builds the search URL, renames nextPageToken, and parses against outputSchema", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return jsonResponse({
        items: [
          {
            id: { kind: "youtube#video", videoId: "dQw4w9WgXcQ" },
            snippet: {
              title: "Never Gonna Give You Up",
              description: "The official video.",
              channelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
              channelTitle: "Rick Astley",
              publishedAt: "2009-10-25T06:57:33Z",
              liveBroadcastContent: "none",
              thumbnails: {
                default: {
                  url: "https://i.ytimg.com/x.jpg",
                  width: 120,
                  height: 90,
                },
              },
            },
          },
        ],
        nextPageToken: "CABC",
      });
    }) as typeof globalThis.fetch;

    const { data } = await searchVideosDefinition.run(
      { part: "snippet", type: "video", order: "relevance", q: "rick astley" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("/youtube/v3/search");
    expect(calls[0]).toContain("part=snippet");
    expect(calls[0]).toContain("type=video");
    expect(calls[0]).toContain("q=rick+astley");
    expect(data.items).toHaveLength(1);
    expect(data.next_page_token).toBe("CABC");
    expect(searchVideosDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });
});

describe("searchVideos: error path", () => {
  it("rejects with quota guidance on a 403 quotaExceeded", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 403,
            message:
              "The request cannot be completed because you have exceeded your quota.",
            errors: [{ reason: "quotaExceeded" }],
          },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await searchVideosDefinition
      .run(
        { part: "snippet", type: "video", order: "relevance", q: "x" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("quotaExceeded");
    expect((err as Error).message).toContain("quota resets once per day");
  });
});

describe("searchVideos: transform", () => {
  it("preserves id.videoId through the output schema", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        items: [{ id: { kind: "youtube#video", videoId: "abc123XYZ_-" } }],
        nextPageToken: "CABC",
      })) as typeof globalThis.fetch;

    const { data } = await searchVideosDefinition.run(
      { part: "snippet", type: "video", order: "relevance", q: "x" },
      { fetch: fakeFetch },
    );

    const parsed = searchVideosDefinition.outputSchema.parse(data);
    expect(parsed.items[0]?.id?.videoId).toBe("abc123XYZ_-");
  });
});
