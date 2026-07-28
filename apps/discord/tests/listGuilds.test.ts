import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/listGuilds.ts";

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

describe("listGuilds: run", () => {
  it("GETs @me/guilds, defaults limit to 20, and wraps the bare array into `guilds`", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse([
        { id: "g1", name: "Guild One" },
        { id: "g2", name: "Guild Two" },
      ]);
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({});
    const { data: result } = await definition.run(input, { fetch: fakeFetch });

    expect(calls).toHaveLength(1);
    const parsed = new URL(calls[0]?.url ?? "");
    expect(parsed.origin + parsed.pathname).toBe(
      "https://discord.com/api/v10/users/@me/guilds",
    );
    expect(parsed.searchParams.get("limit")).toBe("20");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.guilds).toHaveLength(2);
    expect(result.guilds[0]?.id).toBe("g1");
  });

  it("passes limit and after through as query params", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse([]);
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ limit: 50, after: "g5" });
    await definition.run(input, { fetch: fakeFetch });

    const parsed = new URL(calls[0]?.url ?? "");
    expect(parsed.searchParams.get("limit")).toBe("50");
    expect(parsed.searchParams.get("after")).toBe("g5");
  });

  it("throws a ConnectorHttpError on a 4xx", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({ message: "401: Unauthorized" }, { status: 401 })) as never;

    const input = inputSchema.parse({});
    const err = await definition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
  });
});
