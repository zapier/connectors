import { describe, expect, it } from "vitest";

import replyToCommentDefinition from "../scripts/replyToComment.ts";

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

describe("replyToComment: happy path", () => {
  it("POSTs comments with part=snippet and the nested snippet body, returning the comment", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "reply_abc",
        snippet: {
          textOriginal: "Thanks for watching!",
          textDisplay: "Thanks for watching!",
          parentId: "thread_abc",
          authorDisplayName: "Test User",
        },
      });
    }) as typeof globalThis.fetch;

    const { data } = await replyToCommentDefinition.run(
      {
        part: "snippet",
        snippet: {
          parentId: "thread_abc",
          textOriginal: "Thanks for watching!",
        },
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.url).toContain("/youtube/v3/comments");
    expect(calls[0]?.url).toContain("part=snippet");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      snippet: {
        parentId: "thread_abc",
        textOriginal: "Thanks for watching!",
      },
    });
    expect(replyToCommentDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
    expect(data.id).toBe("reply_abc");
  });
});

describe("replyToComment: error path", () => {
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
      replyToCommentDefinition.run(
        { part: "snippet", snippet: { parentId: "x", textOriginal: "hi" } },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow();
  });

  it("translates a 400 operationNotSupported (reply-to-reply) into actionable guidance", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 400,
            message: "Operation not supported.",
            errors: [{ reason: "operationNotSupported" }],
          },
        },
        { status: 400 },
      )) as typeof globalThis.fetch;

    await expect(
      replyToCommentDefinition.run(
        {
          part: "snippet",
          snippet: { parentId: "a_reply_id", textOriginal: "hi" },
        },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow(/top-level comment thread|nested replies/i);
  });
});

describe("replyToComment: governance", () => {
  it("is not idempotent — replying twice creates two replies", () => {
    expect(replyToCommentDefinition.annotations?.idempotentHint).toBe(false);
  });
});
