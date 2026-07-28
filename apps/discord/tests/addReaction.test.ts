import { describe, expect, it } from "vitest";

import script from "../scripts/addReaction.ts";

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

describe("addReaction: run", () => {
  it("PUTs the reactions/@me endpoint (URL-encoding the emoji) and returns the 204 status", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(null, { status: 204 });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({
      channel_id: "123",
      message_id: "999",
      emoji: "👍",
    });
    const { data: result } = await script.run(input, { fetch: fakeFetch });

    expect(calls[0]?.url).toBe(
      `https://discord.com/api/v10/channels/123/messages/999/reactions/${encodeURIComponent("👍")}/@me`,
    );
    expect(calls[0]?.init?.method).toBe("PUT");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.status).toBe(204);
  });

  it("rejects on a 4xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Unknown Emoji", code: 10014 },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({
      channel_id: "123",
      message_id: "999",
      emoji: "nope",
    });
    await expect(script.run(input, { fetch: fakeFetch })).rejects.toThrow();
  });
});
