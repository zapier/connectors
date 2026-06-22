import { describe, expect, it } from "vitest";

import pinChatMessageDefinition from "../scripts/pinChatMessage.ts";

const { inputSchema, outputSchema } = pinChatMessageDefinition;

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

describe("pinChatMessage: inputSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(inputSchema.safeParse({ chat_id: "1", message_id: 5 }).success).toBe(
      true,
    );
  });

  it("rejects an unknown key", () => {
    expect(
      inputSchema.safeParse({ chat_id: "1", message_id: 5, nope: true })
        .success,
    ).toBe(false);
  });

  it("rejects a missing message_id", () => {
    expect(inputSchema.safeParse({ chat_id: "1" }).success).toBe(false);
  });
});

describe("pinChatMessage: run", () => {
  it("POSTs the validated input to /pinChatMessage and returns { ok: true }", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ ok: true, result: true });
    }) as typeof globalThis.fetch;

    const { data: result } = await pinChatMessageDefinition.run(
      { chat_id: "1", message_id: 5 },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.telegram.org/pinChatMessage");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      chat_id: "1",
      message_id: 5,
    });

    expect(result.ok).toBe(true);
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("throws an Error whose message reflects the Telegram error on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          ok: false,
          error_code: 400,
          description: "Bad Request: message to pin not found",
        },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await pinChatMessageDefinition
      .run({ chat_id: "1", message_id: 5 }, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/pinChatMessage 400/);
  });
});
