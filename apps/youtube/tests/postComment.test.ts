import { describe, expect, it } from "vitest";

import postCommentDefinition from "../scripts/postComment.ts";

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

describe("postComment: happy path", () => {
  it("POSTs commentThreads with part=snippet and the nested snippet body, returning the thread", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "thread_abc",
        snippet: {
          videoId: "dQw4w9WgXcQ",
          totalReplyCount: 0,
          isPublic: true,
          topLevelComment: {
            id: "comment_abc",
            snippet: {
              textOriginal: "Great video!",
              textDisplay: "Great video!",
              authorDisplayName: "Test User",
            },
          },
        },
      });
    }) as typeof globalThis.fetch;

    const { data } = await postCommentDefinition.run(
      {
        part: "snippet",
        snippet: {
          videoId: "dQw4w9WgXcQ",
          topLevelComment: { snippet: { textOriginal: "Great video!" } },
        },
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.url).toContain("/youtube/v3/commentThreads");
    expect(calls[0]?.url).toContain("part=snippet");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      snippet: {
        videoId: "dQw4w9WgXcQ",
        topLevelComment: { snippet: { textOriginal: "Great video!" } },
      },
    });
    expect(postCommentDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
    expect(data.id).toBe("thread_abc");
  });
});

describe("postComment: error path", () => {
  it("rejects on a 403 (force-ssl scope missing)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 403,
            message: "The request is missing the youtube.force-ssl scope.",
            errors: [{ reason: "forbidden" }],
          },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    await expect(
      postCommentDefinition.run(
        {
          part: "snippet",
          snippet: {
            videoId: "x",
            topLevelComment: { snippet: { textOriginal: "hi" } },
          },
        },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow();
  });
});

describe("postComment: governance", () => {
  it("is not idempotent — posting twice creates two comments", () => {
    expect(postCommentDefinition.annotations?.idempotentHint).toBe(false);
  });
});
