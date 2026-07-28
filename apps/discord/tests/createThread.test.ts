import { describe, expect, it } from "vitest";

import script from "../scripts/createThread.ts";

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

const sampleThread = {
  id: "555",
  type: 11,
  name: "my thread",
  parent_id: "123",
};

describe("createThread: run", () => {
  it("POSTs to the threads endpoint without a message (standalone thread)", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(sampleThread);
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ channel_id: "123", name: "my thread" });
    const { data: result } = await script.run(input, { fetch: fakeFetch });

    expect(calls[0]?.url).toBe(
      "https://discord.com/api/v10/channels/123/threads",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toMatchObject({ name: "my thread" });
    expect(body).not.toHaveProperty("message");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe("555");
  });

  it("includes the message body when creating a forum post", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({ ...sampleThread, type: 11 });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({
      channel_id: "123",
      name: "forum post",
      message: { content: "opening post" },
    });
    await script.run(input, { fetch: fakeFetch });

    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      name: "forum post",
      message: { content: "opening post" },
    });
  });

  it("rejects on a 4xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Missing Permissions", code: 50013 },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ channel_id: "123", name: "x" });
    await expect(script.run(input, { fetch: fakeFetch })).rejects.toThrow();
  });
});
