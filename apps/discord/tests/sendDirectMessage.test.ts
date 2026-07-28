import { describe, expect, it } from "vitest";

import script from "../scripts/sendDirectMessage.ts";

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
  channel_id: "dm-1",
  content: "hi there",
  timestamp: "2024-01-01T00:00:00.000+00:00",
};

describe("sendDirectMessage: run", () => {
  it("opens a DM channel then posts the message — two fetch calls", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      if (url === "https://discord.com/api/v10/users/@me/channels") {
        return jsonResponse({ id: "dm-1" });
      }
      return jsonResponse(sampleMessage);
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({
      recipient_id: "42",
      content: "hi there",
    });
    const { data: result } = await script.run(input, { fetch: fakeFetch });

    expect(calls).toHaveLength(2);
    // Step 1: open DM channel.
    expect(calls[0]?.url).toBe(
      "https://discord.com/api/v10/users/@me/channels",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      recipient_id: "42",
    });
    // Step 2: post to the returned DM channel id.
    expect(calls[1]?.url).toBe(
      "https://discord.com/api/v10/channels/dm-1/messages",
    );
    expect(calls[1]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[1]?.init?.body as string)).toMatchObject({
      content: "hi there",
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe("999");
  });

  it("rejects when opening the DM channel fails (4xx)", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(
        { message: "Cannot send messages to this user", code: 50007 },
        { status: 403 },
      );
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ recipient_id: "42", content: "x" });
    await expect(script.run(input, { fetch: fakeFetch })).rejects.toThrow();
    // Should not attempt the post step after the open step fails.
    expect(calls).toHaveLength(1);
  });
});
