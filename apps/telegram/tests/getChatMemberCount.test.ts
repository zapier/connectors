import { describe, expect, it } from "vitest";

import getChatMemberCountDefinition from "../scripts/getChatMemberCount.ts";

const { inputSchema, outputSchema } = getChatMemberCountDefinition;

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

describe("getChatMemberCount: inputSchema", () => {
  it("accepts a valid chat_id", () => {
    expect(inputSchema.safeParse({ chat_id: "123" }).success).toBe(true);
  });

  it("rejects input missing the required chat_id field", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-string chat_id", () => {
    expect(inputSchema.safeParse({ chat_id: 123 }).success).toBe(false);
  });
});

describe("getChatMemberCount: run", () => {
  it("POSTs to the clean getChatMemberCount URL and returns { count }", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ ok: true, result: 42 });
    }) as typeof globalThis.fetch;

    const { data: result } = await getChatMemberCountDefinition.run(
      { chat_id: "123" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.telegram.org/bot{{bot_token}}/getChatMemberCount",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      chat_id: "123",
    });

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.count).toBe(42);
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

    const err = await getChatMemberCountDefinition
      .run({ chat_id: "123" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/chat not found/);
  });
});
