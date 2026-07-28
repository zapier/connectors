import { describe, expect, it } from "vitest";

import script from "../scripts/listActiveThreads.ts";

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
  name: "a thread",
  parent_id: "123",
};

describe("listActiveThreads: run", () => {
  it("GETs the active-threads endpoint and unwraps the threads field", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      // Discord wraps the list in { threads, members } at top level.
      return jsonResponse({ threads: [sampleThread], members: [] });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ guild_id: "g1" });
    const { data: result } = await script.run(input, { fetch: fakeFetch });

    expect(calls[0]?.url).toBe(
      "https://discord.com/api/v10/guilds/g1/threads/active",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.threads).toHaveLength(1);
    expect(result.threads[0]?.id).toBe("555");
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
