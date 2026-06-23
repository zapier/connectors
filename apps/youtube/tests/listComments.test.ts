import { describe, expect, it } from "vitest";

import listCommentsDefinition from "../scripts/listComments.ts";

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

describe("listComments: happy path", () => {
  it("builds the commentThreads URL with videoId + part, renames nextPageToken, and parses", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return jsonResponse({
        items: [
          {
            id: "thread1",
            snippet: {
              videoId: "dQw4w9WgXcQ",
              totalReplyCount: 1,
              isPublic: true,
              topLevelComment: {
                id: "comment1",
                snippet: {
                  textDisplay: "Great video!",
                  textOriginal: "Great video!",
                  authorDisplayName: "Viewer",
                  likeCount: 5,
                  publishedAt: "2024-01-01T00:00:00Z",
                },
              },
            },
            replies: {
              comments: [
                {
                  id: "reply1",
                  snippet: { textDisplay: "Agreed", parentId: "comment1" },
                },
              ],
            },
          },
        ],
        nextPageToken: "CABC",
      });
    }) as typeof globalThis.fetch;

    const { data } = await listCommentsDefinition.run(
      { part: "snippet,replies", order: "time", videoId: "dQw4w9WgXcQ" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("/youtube/v3/commentThreads");
    expect(calls[0]).toContain("videoId=dQw4w9WgXcQ");
    expect(calls[0]).toContain("part=snippet");
    expect(data.items).toHaveLength(1);
    expect(data.next_page_token).toBe("CABC");
    expect(listCommentsDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });
});

describe("listComments: error path", () => {
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
      listCommentsDefinition.run(
        { part: "snippet,replies", order: "time", videoId: "x" },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow();
  });
});

describe("listComments: transform", () => {
  it("preserves the nested topLevelComment text through parse", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        items: [
          {
            id: "thread1",
            snippet: {
              topLevelComment: {
                id: "comment1",
                snippet: { textDisplay: "Hidden gem", likeCount: 99 },
              },
            },
          },
        ],
      })) as typeof globalThis.fetch;

    const { data } = await listCommentsDefinition.run(
      { part: "snippet,replies", order: "time", videoId: "dQw4w9WgXcQ" },
      { fetch: fakeFetch },
    );

    const parsed = listCommentsDefinition.outputSchema.parse(data);
    expect(
      parsed.items[0]?.snippet?.topLevelComment?.snippet?.textDisplay,
    ).toBe("Hidden gem");
    expect(parsed.items[0]?.snippet?.topLevelComment?.snippet?.likeCount).toBe(
      99,
    );
  });
});
