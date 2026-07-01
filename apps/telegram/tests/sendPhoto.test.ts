import { describe, expect, it } from "vitest";

import sendPhotoDefinition from "../scripts/sendPhoto.ts";

const { inputSchema, outputSchema } = sendPhotoDefinition;

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
  photo: [{ file_id: "abc", file_unique_id: "u", width: 90, height: 90 }],
};

describe("sendPhoto: inputSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(
      inputSchema.safeParse({
        chat_id: "123",
        photo: "https://example.com/p.jpg",
      }).success,
    ).toBe(true);
  });

  it("rejects input missing the required photo field", () => {
    expect(inputSchema.safeParse({ chat_id: "123" }).success).toBe(false);
  });

  it("rejects a non-string photo", () => {
    expect(inputSchema.safeParse({ chat_id: "123", photo: 5 }).success).toBe(
      false,
    );
  });
});

describe("sendPhoto: run", () => {
  it("POSTs to the clean sendPhoto URL and returns the unwrapped result", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ ok: true, result: sampleMessage });
    }) as typeof globalThis.fetch;

    const { data: result } = await sendPhotoDefinition.run(
      { chat_id: "123", photo: "https://example.com/p.jpg" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.telegram.org/bot{{bot_token}}/sendPhoto",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      chat_id: "123",
      photo: "https://example.com/p.jpg",
    });

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.message_id).toBe(42);
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

    const err = await sendPhotoDefinition
      .run(
        { chat_id: "123", photo: "https://example.com/p.jpg" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/chat not found/);
  });
});
