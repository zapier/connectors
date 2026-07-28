import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/searchMembers.ts";

const { inputSchema, outputSchema } = definition;

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

describe("searchMembers: run", () => {
  it("GETs the member-search endpoint and wraps the bare array into `members`", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse([
        {
          nick: "Ada",
          roles: ["1"],
          joined_at: null,
          user: { id: "42", username: "ada" },
        },
      ]);
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ guild_id: "g1", query: "Ad" });
    const { data: result } = await definition.run(input, { fetch: fakeFetch });

    expect(calls).toHaveLength(1);
    const parsed = new URL(calls[0]?.url ?? "");
    expect(parsed.origin + parsed.pathname).toBe(
      "https://discord.com/api/v10/guilds/g1/members/search",
    );
    expect(parsed.searchParams.get("query")).toBe("Ad");
    expect(parsed.searchParams.get("limit")).toBe("20");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.members).toHaveLength(1);
    expect(result.members[0]?.nick).toBe("Ada");
  });

  it("uses an explicit limit when provided", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse([]);
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ guild_id: "g1", query: "x", limit: 5 });
    await definition.run(input, { fetch: fakeFetch });

    expect(new URL(calls[0]?.url ?? "").searchParams.get("limit")).toBe("5");
  });

  it("throws a ConnectorHttpError on a 4xx", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({ message: "Missing Access" }, { status: 403 })) as never;

    const input = inputSchema.parse({ guild_id: "g1", query: "x" });
    const err = await definition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
