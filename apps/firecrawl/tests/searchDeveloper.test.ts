import { describe, expect, it } from "vitest";

import searchDeveloperDefinition from "../scripts/searchDeveloper.ts";

const { inputSchema } = searchDeveloperDefinition;

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

describe("searchDeveloper: inputSchema", () => {
  it("requires query", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ query: "how to scrape" }).success).toBe(
      true,
    );
  });
});

describe("searchDeveloper: governance", () => {
  it("is read-only, non-destructive", () => {
    expect(searchDeveloperDefinition.annotations?.readOnlyHint).toBe(true);
    expect(searchDeveloperDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("searchDeveloper: run", () => {
  it("POSTs /v2/search/developer and returns the top-level payload", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        results: [{ url: "https://github.com/firecrawl", type: "readme" }],
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await searchDeveloperDefinition.run(
      { query: "how to scrape" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.firecrawl.dev/v2/search/developer");
    expect(calls[0]!.init?.method).toBe("POST");
    const sentBody = JSON.parse(String(calls[0]!.init?.body));
    // default k applied in run()
    expect(sentBody).toMatchObject({ query: "how to scrape", k: 10 });
    expect(result.results).toHaveLength(1);
    expect(result.results[0]!.url).toBe("https://github.com/firecrawl");
  });

  it("throws on a non-2xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Bad Request" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    await expect(
      searchDeveloperDefinition.run(
        { query: "how to scrape" },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow();
  });
});
