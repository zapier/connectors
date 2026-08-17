import { describe, expect, it } from "vitest";

import crawlDefinition from "../scripts/crawl.ts";

const { inputSchema } = crawlDefinition;

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

describe("crawl: inputSchema", () => {
  it("requires url", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ url: "https://example.com" }).success).toBe(
      true,
    );
  });

  it("accepts crawl options and nested scrapeOptions", () => {
    const parsed = inputSchema.safeParse({
      url: "https://example.com",
      includePaths: ["/docs/.*"],
      limit: 50,
      sitemap: "include",
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    });
    expect(parsed.success).toBe(true);
  });
});

describe("crawl: governance", () => {
  it("is a POST job-starter — not read-only, non-destructive", () => {
    expect(crawlDefinition.annotations?.readOnlyHint).toBeFalsy();
    expect(crawlDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("crawl: run", () => {
  it("POSTs /v2/crawl and returns the job id", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        id: "crawl-123",
        url: "https://api.firecrawl.dev/v2/crawl/crawl-123",
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await crawlDefinition.run(
      { url: "https://example.com", limit: 25 },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.firecrawl.dev/v2/crawl");
    expect(calls[0]!.init?.method).toBe("POST");
    const sentBody = JSON.parse(String(calls[0]!.init?.body));
    expect(sentBody).toMatchObject({ url: "https://example.com", limit: 25 });
    expect(result.id).toBe("crawl-123");
  });

  it("throws on a non-2xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Payment Required" },
        { status: 402 },
      )) as typeof globalThis.fetch;

    await expect(
      crawlDefinition.run({ url: "https://example.com" }, { fetch: fakeFetch }),
    ).rejects.toThrow();
  });
});
