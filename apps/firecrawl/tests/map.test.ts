import { describe, expect, it } from "vitest";

import mapDefinition from "../scripts/map.ts";

const { inputSchema } = mapDefinition;

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

describe("map: inputSchema", () => {
  it("requires url", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ url: "https://example.com" }).success).toBe(
      true,
    );
  });
});

describe("map: governance", () => {
  it("is read-only, non-destructive", () => {
    expect(mapDefinition.annotations?.readOnlyHint).toBe(true);
    expect(mapDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("map: run", () => {
  it("POSTs /v2/map and returns the top-level links array", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        links: [{ url: "https://example.com/a" }],
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await mapDefinition.run(
      { url: "https://example.com", search: "docs" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.firecrawl.dev/v2/map");
    expect(calls[0]!.init?.method).toBe("POST");
    const sentBody = JSON.parse(String(calls[0]!.init?.body));
    expect(sentBody).toMatchObject({
      url: "https://example.com",
      search: "docs",
      limit: 100,
    });
    expect(result.links).toHaveLength(1);
    expect(result.links[0]!.url).toBe("https://example.com/a");
  });

  it("throws on a non-2xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Bad Request" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    await expect(
      mapDefinition.run({ url: "https://example.com" }, { fetch: fakeFetch }),
    ).rejects.toThrow();
  });
});
