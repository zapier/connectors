import { describe, expect, it } from "vitest";

import script from "../scripts/listMembers.ts";

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

const sampleMember = {
  nick: "Sam",
  roles: ["r1"],
  joined_at: "2024-01-01T00:00:00.000+00:00",
  user: { id: "42", username: "sam" },
};

describe("listMembers: run", () => {
  it("GETs the members endpoint, applies default limit 20, and wraps the bare array under members", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      // Discord returns a bare array at top level.
      return jsonResponse([sampleMember]);
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ guild_id: "g1" });
    const { data: result } = await script.run(input, { fetch: fakeFetch });

    expect(calls[0]?.url).toBe(
      "https://discord.com/api/v10/guilds/g1/members?limit=20",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.members).toHaveLength(1);
    expect(result.members[0]?.nick).toBe("Sam");
  });

  it("passes an explicit limit and after cursor as query params", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse([]);
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({
      guild_id: "g1",
      limit: 100,
      after: "42",
    });
    await script.run(input, { fetch: fakeFetch });

    expect(calls[0]?.url).toContain("limit=100");
    expect(calls[0]?.url).toContain("after=42");
  });

  it("rejects on a 4xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Missing Access", code: 50001 },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ guild_id: "nope" });
    await expect(script.run(input, { fetch: fakeFetch })).rejects.toThrow();
  });
});
