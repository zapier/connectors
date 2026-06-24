import { describe, expect, it } from "vitest";

import forwardMessageDefinition from "../scripts/forwardMessage.ts";

const { inputSchema, outputSchema } = forwardMessageDefinition;

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

describe("forwardMessage: inputSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(
      inputSchema.safeParse({
        chat_id: "1",
        from_chat_id: "2",
        message_id: 5,
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown key", () => {
    expect(
      inputSchema.safeParse({
        chat_id: "1",
        from_chat_id: "2",
        message_id: 5,
        nope: true,
      }).success,
    ).toBe(false);
  });

  it("rejects a missing from_chat_id", () => {
    expect(inputSchema.safeParse({ chat_id: "1", message_id: 5 }).success).toBe(
      false,
    );
  });
});

describe("forwardMessage: run", () => {
  it("POSTs the validated input to /forwardMessage and returns the parsed message", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        ok: true,
        result: {
          message_id: 5,
          date: 1700000000,
          chat: { id: 1, type: "group" },
          text: "hi",
        },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await forwardMessageDefinition.run(
      { chat_id: "1", from_chat_id: "2", message_id: 5 },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.telegram.org/forwardMessage");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      chat_id: "1",
      from_chat_id: "2",
      message_id: 5,
    });

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.message_id).toBe(5);
  });

  it("throws an Error whose message reflects the Telegram error on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          ok: false,
          error_code: 400,
          description: "Bad Request: message to forward not found",
        },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await forwardMessageDefinition
      .run(
        { chat_id: "1", from_chat_id: "2", message_id: 5 },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/forwardMessage 400/);
  });
});
