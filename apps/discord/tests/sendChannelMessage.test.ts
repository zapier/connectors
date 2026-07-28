import { describe, expect, it } from "vitest";

import script from "../scripts/sendChannelMessage.ts";

const { inputSchema, outputSchema } = script;

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

const sampleMessage = {
  id: "999",
  channel_id: "123",
  content: "hello world",
  timestamp: "2024-01-01T00:00:00.000+00:00",
};

describe("sendChannelMessage: run", () => {
  it("POSTs to the channel messages endpoint and returns the message", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(sampleMessage);
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({
      channel_id: "123",
      content: "hello world",
    });
    const { data: result } = await script.run(input, { fetch: fakeFetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://discord.com/api/v10/channels/123/messages",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      content: "hello world",
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe("999");
  });

  it("builds a message_reference on the request body when replying", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(sampleMessage);
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({
      channel_id: "123",
      content: "a reply",
      message_reference: { message_id: "888" },
    });
    await script.run(input, { fetch: fakeFetch });

    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      content: "a reply",
      message_reference: { message_id: "888" },
    });
  });

  it("rejects on a 4xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Missing Access", code: 50001 },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ channel_id: "123", content: "x" });
    await expect(script.run(input, { fetch: fakeFetch })).rejects.toThrow();
  });
});
