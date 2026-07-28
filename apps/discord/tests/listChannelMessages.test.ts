import { describe, expect, it } from "vitest";

import script from "../scripts/listChannelMessages.ts";

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
  content: "hello",
  timestamp: "2024-01-01T00:00:00.000+00:00",
};

describe("listChannelMessages: run", () => {
  it("GETs the messages endpoint, applies default limit 10, and wraps the bare array under messages", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      // Discord returns a bare array at top level.
      return jsonResponse([sampleMessage]);
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ channel_id: "123" });
    const { data: result } = await script.run(input, { fetch: fakeFetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://discord.com/api/v10/channels/123/messages?limit=10",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.id).toBe("999");
  });

  it("passes an explicit limit and before cursor as query params", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse([]);
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({
      channel_id: "123",
      limit: 50,
      before: "777",
    });
    await script.run(input, { fetch: fakeFetch });

    expect(calls[0]?.url).toContain("limit=50");
    expect(calls[0]?.url).toContain("before=777");
  });

  it("rejects on a 4xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Unknown Channel", code: 10003 },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ channel_id: "nope" });
    await expect(script.run(input, { fetch: fakeFetch })).rejects.toThrow();
  });
});
