import { describe, expect, it } from "vitest";

import script from "../scripts/listChannels.ts";

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

const sampleChannel = { id: "123", type: 0, name: "general", guild_id: "g1" };

describe("listChannels: run", () => {
  it("GETs the guild channels endpoint and wraps the bare array under channels", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      // Discord returns a bare array at top level.
      return jsonResponse([sampleChannel]);
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ guild_id: "g1" });
    const { data: result } = await script.run(input, { fetch: fakeFetch });

    expect(calls[0]?.url).toBe(
      "https://discord.com/api/v10/guilds/g1/channels",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.channels).toHaveLength(1);
    expect(result.channels[0]?.id).toBe("123");
  });

  it("rejects on a 4xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Unknown Guild", code: 10004 },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ guild_id: "nope" });
    await expect(script.run(input, { fetch: fakeFetch })).rejects.toThrow();
  });
});
