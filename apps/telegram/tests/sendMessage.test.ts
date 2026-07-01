import { describe, expect, it } from "vitest";

import sendMessageDefinition from "../scripts/sendMessage.ts";

const { inputSchema, outputSchema } = sendMessageDefinition;

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

const sampleMessage = {
  message_id: 42,
  date: 1700000000,
  chat: { id: 123, type: "private" },
  text: "hi",
};

describe("sendMessage: inputSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(inputSchema.safeParse({ chat_id: "123", text: "hi" }).success).toBe(
      true,
    );
  });

  it("rejects input missing the required text field", () => {
    expect(inputSchema.safeParse({ chat_id: "123" }).success).toBe(false);
  });

  it("rejects a non-string chat_id", () => {
    expect(inputSchema.safeParse({ chat_id: 123, text: "hi" }).success).toBe(
      false,
    );
  });
});

describe("sendMessage: run", () => {
  it("POSTs to the clean sendMessage URL and returns the unwrapped result", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ ok: true, result: sampleMessage });
    }) as typeof globalThis.fetch;

    const { data: result } = await sendMessageDefinition.run(
      { chat_id: "123", text: "hi" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.telegram.org/bot{{bot_token}}/sendMessage",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      chat_id: "123",
      text: "hi",
    });

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.message_id).toBe(42);
  });

  it("maps disable_link_preview and reply_to_message_id to the wire adapters", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({ ok: true, result: sampleMessage });
    }) as typeof globalThis.fetch;

    await sendMessageDefinition.run(
      {
        chat_id: "123",
        text: "hi",
        disable_link_preview: true,
        reply_to_message_id: 7,
      },
      { fetch: fakeFetch },
    );

    const sent = JSON.parse(calls[0]?.init?.body as string);
    expect(sent.link_preview_options).toEqual({ is_disabled: true });
    expect(sent.reply_parameters).toEqual({ message_id: 7 });
    expect(sent.disable_link_preview).toBeUndefined();
    expect(sent.reply_to_message_id).toBeUndefined();
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

    const err = await sendMessageDefinition
      .run({ chat_id: "123", text: "hi" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/chat not found/);
  });
});
