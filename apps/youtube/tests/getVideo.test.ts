import { describe, expect, it } from "vitest";

import getVideoDefinition from "../scripts/getVideo.ts";

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

describe("getVideo: happy path", () => {
  it("builds the videos URL with id + part, renames nextPageToken, and parses", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return jsonResponse({
        items: [
          {
            id: "dQw4w9WgXcQ",
            snippet: {
              title: "Never Gonna Give You Up",
              channelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
              publishedAt: "2009-10-25T06:57:33Z",
            },
            contentDetails: {
              duration: "PT3M33S",
              definition: "hd",
              caption: "true",
            },
            statistics: { viewCount: "1500000000", likeCount: "16000000" },
            status: { uploadStatus: "processed", privacyStatus: "public" },
          },
        ],
        nextPageToken: "CABC",
      });
    }) as typeof globalThis.fetch;

    const { data } = await getVideoDefinition.run(
      { part: "snippet,contentDetails,statistics,status", id: "dQw4w9WgXcQ" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("/youtube/v3/videos");
    expect(calls[0]).toContain("id=dQw4w9WgXcQ");
    expect(calls[0]).toContain("part=snippet");
    expect(data.items).toHaveLength(1);
    expect(data.next_page_token).toBe("CABC");
    expect(getVideoDefinition.outputSchema.safeParse(data).success).toBe(true);
  });
});

describe("getVideo: error path", () => {
  it("rejects on a 403", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 403,
            message: "Access denied.",
            errors: [{ reason: "quotaExceeded" }],
          },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    await expect(
      getVideoDefinition.run(
        { part: "snippet,contentDetails,statistics,status", id: "x" },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow();
  });
});

describe("getVideo: transform", () => {
  it("keeps string-typed statistics counts intact through parse", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        items: [
          {
            id: "dQw4w9WgXcQ",
            statistics: { viewCount: "1500000000", commentCount: "2300000" },
          },
        ],
      })) as typeof globalThis.fetch;

    const { data } = await getVideoDefinition.run(
      { part: "snippet,contentDetails,statistics,status", id: "dQw4w9WgXcQ" },
      { fetch: fakeFetch },
    );

    const parsed = getVideoDefinition.outputSchema.parse(data);
    expect(parsed.items[0]?.statistics?.viewCount).toBe("1500000000");
    expect(typeof parsed.items[0]?.statistics?.viewCount).toBe("string");
  });
});
