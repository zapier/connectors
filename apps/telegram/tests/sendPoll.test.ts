import { describe, expect, it } from "vitest";

import sendPollDefinition from "../scripts/sendPoll.ts";

const { inputSchema, outputSchema } = sendPollDefinition;

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

describe("sendPoll: inputSchema", () => {
  it("accepts a regular poll without correct_option_id", () => {
    expect(
      inputSchema.safeParse({
        chat_id: "1",
        question: "Q?",
        options: ["A", "B"],
      }).success,
    ).toBe(true);
  });

  it("rejects a quiz without correct_option_id", () => {
    expect(
      inputSchema.safeParse({
        chat_id: "1",
        question: "Q?",
        options: ["A", "B"],
        type: "quiz",
      }).success,
    ).toBe(false);
  });

  it("accepts a quiz with correct_option_id", () => {
    expect(
      inputSchema.safeParse({
        chat_id: "1",
        question: "Q?",
        options: ["A", "B"],
        type: "quiz",
        correct_option_id: 0,
      }).success,
    ).toBe(true);
  });
});

describe("sendPoll: run", () => {
  it("POSTs the validated input to /sendPoll and returns the parsed message", async () => {
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
          poll: {
            id: "p1",
            question: "Q?",
            options: [
              { text: "A", voter_count: 0 },
              { text: "B", voter_count: 0 },
            ],
          },
        },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await sendPollDefinition.run(
      { chat_id: "1", question: "Q?", options: ["A", "B"] },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.telegram.org/sendPoll");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      chat_id: "1",
      question: "Q?",
      options: ["A", "B"],
    });

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.poll?.id).toBe("p1");
  });

  it("throws an Error whose message reflects the Telegram error on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          ok: false,
          error_code: 400,
          description: "Bad Request: chat not found",
        },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await sendPollDefinition
      .run(
        { chat_id: "1", question: "Q?", options: ["A", "B"] },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/sendPoll 400/);
  });
});
