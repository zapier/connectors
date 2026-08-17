import { describe, expect, it } from "vitest";

import getActiveCrawlsDefinition from "../scripts/getActiveCrawls.ts";

const { inputSchema } = getActiveCrawlsDefinition;

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

describe("getActiveCrawls: inputSchema", () => {
  it("accepts an empty input", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });
});

describe("getActiveCrawls: governance", () => {
  it("is read-only, non-destructive", () => {
    expect(getActiveCrawlsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getActiveCrawlsDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("getActiveCrawls: run", () => {
  it("GETs /v2/crawl/active and returns the crawls array", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        crawls: [
          { id: "crawl-1", url: "https://a.com" },
          { id: "crawl-2", url: "https://b.com" },
        ],
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await getActiveCrawlsDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.firecrawl.dev/v2/crawl/active");
    expect(calls[0]!.init?.method).toBe("GET");
    expect(result.crawls).toHaveLength(2);
    expect(result.crawls[0]?.id).toBe("crawl-1");
  });

  it("throws on a non-2xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      )) as typeof globalThis.fetch;

    await expect(
      getActiveCrawlsDefinition.run({}, { fetch: fakeFetch }),
    ).rejects.toThrow();
  });
});
