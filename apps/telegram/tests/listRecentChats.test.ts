import { describe, expect, it } from "vitest";

import listRecentChatsDefinition from "../scripts/listRecentChats.ts";

const { inputSchema, outputSchema } = listRecentChatsDefinition;

function jsonResponse(
  body: unknown,
  init: { status?: number; ok?: boolean } = {},
): Response {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

describe("listRecentChats: inputSchema", () => {
  it("accepts an empty input (limit is optional)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a limit within range", () => {
    expect(inputSchema.safeParse({ limit: 50 }).success).toBe(true);
  });

  it("rejects a limit outside the 1-100 range", () => {
    expect(inputSchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(inputSchema.safeParse({ limit: 101 }).success).toBe(false);
  });
});

describe("listRecentChats: run", () => {
  it("POSTs to getUpdates, de-dupes chats by id, and returns { chats }", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        ok: true,
        result: [
          {
            update_id: 1,
            message: { chat: { id: 10, type: "private", first_name: "A" } },
          },
          {
            update_id: 2,
            channel_post: {
              chat: { id: -100200, type: "channel", title: "News" },
            },
          },
          {
            update_id: 3,
            message: { chat: { id: 10, type: "private", first_name: "A" } },
          },
        ],
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await listRecentChatsDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.telegram.org/getUpdates");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      allowed_updates: ["message", "channel_post"],
    });

    expect(outputSchema.safeParse(result).success).toBe(true);
    // Chat id 10 appears twice in the feed but should be de-duped.
    expect(result.chats).toHaveLength(2);
    expect(result.chats.map((c) => c.id).sort((a, b) => a - b)).toEqual([
      -100200, 10,
    ]);
  });

  it("throws an Error with an actionable message on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          ok: false,
          error_code: 400,
          description: "Bad Request: chat not found",
        },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await listRecentChatsDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/chat not found/);
  });
});
