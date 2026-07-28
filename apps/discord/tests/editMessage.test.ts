import { describe, expect, it } from "vitest";

import script from "../scripts/editMessage.ts";

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
  content: "edited",
  timestamp: "2024-01-01T00:00:00.000+00:00",
};

describe("editMessage: run", () => {
  it("PATCHes the message endpoint with the new content", async () => {
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
      message_id: "999",
      content: "edited",
    });
    const { data: result } = await script.run(input, { fetch: fakeFetch });

    expect(calls[0]?.url).toBe(
      "https://discord.com/api/v10/channels/123/messages/999",
    );
    expect(calls[0]?.init?.method).toBe("PATCH");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      content: "edited",
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.content).toBe("edited");
  });

  it("rejects on a 4xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          message: "Cannot edit a message authored by another user",
          code: 50005,
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({
      channel_id: "123",
      message_id: "999",
      content: "x",
    });
    await expect(script.run(input, { fetch: fakeFetch })).rejects.toThrow();
  });
});
