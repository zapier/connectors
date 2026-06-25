import { describe, expect, it } from "vitest";

import listPlaylistsDefinition from "../scripts/listPlaylists.ts";

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

describe("listPlaylists: happy path", () => {
  it("builds the playlists URL with mine + part, renames nextPageToken, and parses", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return jsonResponse({
        items: [
          {
            id: "PLabc123",
            snippet: {
              title: "My Playlist",
              description: "A playlist.",
              channelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
              channelTitle: "Me",
              publishedAt: "2024-01-01T00:00:00Z",
            },
            status: { privacyStatus: "public" },
            contentDetails: { itemCount: 12 },
          },
        ],
        nextPageToken: "CABC",
      });
    }) as typeof globalThis.fetch;

    const { data } = await listPlaylistsDefinition.run(
      { part: "snippet,contentDetails,status", mine: true },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("/youtube/v3/playlists");
    expect(calls[0]).toContain("mine=true");
    expect(calls[0]).toContain("part=snippet");
    expect(data.items).toHaveLength(1);
    expect(data.next_page_token).toBe("CABC");
    expect(listPlaylistsDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });
});

describe("listPlaylists: error path", () => {
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
      listPlaylistsDefinition.run(
        { part: "snippet,contentDetails,status", mine: true },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow();
  });
});

describe("listPlaylists: transform", () => {
  it("preserves the int itemCount under contentDetails through parse", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        items: [{ id: "PLabc123", contentDetails: { itemCount: 42 } }],
      })) as typeof globalThis.fetch;

    const { data } = await listPlaylistsDefinition.run(
      { part: "snippet,contentDetails,status", mine: true },
      { fetch: fakeFetch },
    );

    const parsed = listPlaylistsDefinition.outputSchema.parse(data);
    expect(parsed.items[0]?.contentDetails?.itemCount).toBe(42);
  });
});
