import { describe, expect, it } from "vitest";

import listPlaylistItemsDefinition from "../scripts/listPlaylistItems.ts";

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

describe("listPlaylistItems: happy path", () => {
  it("builds the playlistItems URL with playlistId + part, renames nextPageToken, and parses", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return jsonResponse({
        items: [
          {
            id: "PLI_item_1",
            snippet: {
              playlistId: "PLabc123",
              position: 0,
              title: "First video",
              channelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
              publishedAt: "2024-01-01T00:00:00Z",
              resourceId: { kind: "youtube#video", videoId: "dQw4w9WgXcQ" },
            },
            contentDetails: {
              videoId: "dQw4w9WgXcQ",
              videoPublishedAt: "2009-10-25T06:57:33Z",
            },
            status: { privacyStatus: "public" },
          },
        ],
        nextPageToken: "CABC",
      });
    }) as typeof globalThis.fetch;

    const { data } = await listPlaylistItemsDefinition.run(
      { part: "snippet,contentDetails,status", playlistId: "PLabc123" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("/youtube/v3/playlistItems");
    expect(calls[0]).toContain("playlistId=PLabc123");
    expect(calls[0]).toContain("part=snippet");
    expect(data.items).toHaveLength(1);
    expect(data.next_page_token).toBe("CABC");
    expect(
      listPlaylistItemsDefinition.outputSchema.safeParse(data).success,
    ).toBe(true);
  });
});

describe("listPlaylistItems: error path", () => {
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
      listPlaylistItemsDefinition.run(
        { part: "snippet,contentDetails,status", playlistId: "PLabc123" },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow();
  });
});

describe("listPlaylistItems: transform", () => {
  it("preserves the nested resourceId.videoId distinct from the playlistItem id", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        items: [
          {
            id: "PLI_item_1",
            snippet: {
              resourceId: { kind: "youtube#video", videoId: "dQw4w9WgXcQ" },
            },
          },
        ],
      })) as typeof globalThis.fetch;

    const { data } = await listPlaylistItemsDefinition.run(
      { part: "snippet,contentDetails,status", playlistId: "PLabc123" },
      { fetch: fakeFetch },
    );

    const parsed = listPlaylistItemsDefinition.outputSchema.parse(data);
    expect(parsed.items[0]?.id).toBe("PLI_item_1");
    expect(parsed.items[0]?.snippet?.resourceId?.videoId).toBe("dQw4w9WgXcQ");
  });
});
