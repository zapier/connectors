import { describe, expect, it } from "vitest";

import getChatMemberDefinition from "../scripts/getChatMember.ts";

const { inputSchema, outputSchema } = getChatMemberDefinition;

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

describe("getChatMember: inputSchema", () => {
  it("accepts a valid chat_id and user_id", () => {
    expect(inputSchema.safeParse({ chat_id: "123", user_id: 5 }).success).toBe(
      true,
    );
  });

  it("rejects input missing the required user_id field", () => {
    expect(inputSchema.safeParse({ chat_id: "123" }).success).toBe(false);
  });

  it("rejects a non-numeric user_id", () => {
    expect(
      inputSchema.safeParse({ chat_id: "123", user_id: "5" }).success,
    ).toBe(false);
  });
});

describe("getChatMember: run", () => {
  it("POSTs to the clean getChatMember URL and returns the unwrapped ChatMember", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        ok: true,
        result: {
          status: "administrator",
          user: { id: 5, is_bot: false, first_name: "Sam" },
        },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await getChatMemberDefinition.run(
      { chat_id: "123", user_id: 5 },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.telegram.org/getChatMember");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      chat_id: "123",
      user_id: 5,
    });

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.status).toBe("administrator");
    expect(result.user.id).toBe(5);
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

    const err = await getChatMemberDefinition
      .run({ chat_id: "123", user_id: 5 }, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/chat not found/);
  });
});
