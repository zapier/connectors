import { describe, expect, it } from "vitest";

import searchDefinition from "../scripts/search.ts";

const { inputSchema } = searchDefinition;

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

describe("search: inputSchema", () => {
  it("requires query", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ query: "firecrawl" }).success).toBe(true);
  });

  it("rejects passing both includeDomains and excludeDomains, accepts one", () => {
    expect(
      inputSchema.safeParse({
        query: "firecrawl",
        includeDomains: ["a.com"],
        excludeDomains: ["b.com"],
      }).success,
    ).toBe(false);
    expect(
      inputSchema.safeParse({
        query: "firecrawl",
        includeDomains: ["a.com"],
      }).success,
    ).toBe(true);
    expect(
      inputSchema.safeParse({
        query: "firecrawl",
        excludeDomains: ["b.com"],
      }).success,
    ).toBe(true);
  });
});

describe("search: governance", () => {
  it("is read-only, non-destructive", () => {
    expect(searchDefinition.annotations?.readOnlyHint).toBe(true);
    expect(searchDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("search: run", () => {
  it("POSTs /v2/search and returns the unwrapped data payload", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        data: { web: [{ url: "https://example.com", title: "Example" }] },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await searchDefinition.run(
      { query: "firecrawl" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.firecrawl.dev/v2/search");
    expect(calls[0]!.init?.method).toBe("POST");
    const sentBody = JSON.parse(String(calls[0]!.init?.body));
    // default limit applied in run()
    expect(sentBody).toMatchObject({ query: "firecrawl", limit: 10 });
    // envelope unwrapped: agent sees data directly
    expect(result.web).toHaveLength(1);
    expect(result.web![0]!.url).toBe("https://example.com");
  });

  it("throws on a non-2xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Bad Request" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    await expect(
      searchDefinition.run({ query: "firecrawl" }, { fetch: fakeFetch }),
    ).rejects.toThrow();
  });
});
