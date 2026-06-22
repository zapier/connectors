import { describe, expect, it } from "vitest";

import editMessageTextDefinition from "../scripts/editMessageText.ts";

const { inputSchema, outputSchema } = editMessageTextDefinition;

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

describe("editMessageText: inputSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(
      inputSchema.safeParse({
        chat_id: "1",
        message_id: 5,
        text: "edited",
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown key", () => {
    expect(
      inputSchema.safeParse({
        chat_id: "1",
        message_id: 5,
        text: "edited",
        nope: true,
      }).success,
    ).toBe(false);
  });

  it("rejects a missing text", () => {
    expect(inputSchema.safeParse({ chat_id: "1", message_id: 5 }).success).toBe(
      false,
    );
  });
});

describe("editMessageText: run", () => {
  it("POSTs the validated input to /editMessageText and returns the parsed message", async () => {
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
          chat: { id: 1, type: "private" },
          text: "edited",
        },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await editMessageTextDefinition.run(
      { chat_id: "1", message_id: 5, text: "edited" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.telegram.org/editMessageText");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      chat_id: "1",
      message_id: 5,
      text: "edited",
    });

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.text).toBe("edited");
  });

  it("maps disable_link_preview to the wire's link_preview_options.is_disabled", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({
        ok: true,
        result: {
          message_id: 5,
          date: 1700000000,
          chat: { id: 1, type: "private" },
          text: "edited",
        },
      });
    }) as typeof globalThis.fetch;

    await editMessageTextDefinition.run(
      {
        chat_id: "1",
        message_id: 5,
        text: "edited",
        disable_link_preview: true,
      },
      { fetch: fakeFetch },
    );

    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.link_preview_options).toEqual({ is_disabled: true });
    expect(body.disable_link_preview).toBeUndefined();
  });

  it("throws an Error whose message reflects the Telegram error on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          ok: false,
          error_code: 400,
          description: "Bad Request: message to edit not found",
        },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await editMessageTextDefinition
      .run(
        { chat_id: "1", message_id: 5, text: "edited" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/editMessageText 400/);
  });
});
