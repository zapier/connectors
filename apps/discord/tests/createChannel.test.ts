import { describe, expect, it } from "vitest";

import script from "../scripts/createChannel.ts";

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

const sampleChannel = {
  id: "456",
  type: 0,
  name: "new-channel",
  guild_id: "g1",
};

describe("createChannel: run", () => {
  it("POSTs to the guild channels endpoint with the channel fields", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(sampleChannel);
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({
      guild_id: "g1",
      name: "new-channel",
      type: 0,
      topic: "hello",
    });
    const { data: result } = await script.run(input, { fetch: fakeFetch });

    expect(calls[0]?.url).toBe(
      "https://discord.com/api/v10/guilds/g1/channels",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      name: "new-channel",
      type: 0,
      topic: "hello",
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe("456");
  });

  it("rejects on a 4xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Missing Permissions", code: 50013 },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ guild_id: "g1", name: "x" });
    await expect(script.run(input, { fetch: fakeFetch })).rejects.toThrow();
  });
});
