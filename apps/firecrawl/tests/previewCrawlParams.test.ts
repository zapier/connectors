import { describe, expect, it } from "vitest";

import previewCrawlParamsDefinition from "../scripts/previewCrawlParams.ts";

const { inputSchema } = previewCrawlParamsDefinition;

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

describe("previewCrawlParams: inputSchema", () => {
  it("requires url and prompt", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ url: "https://example.com" }).success).toBe(
      false,
    );
    expect(
      inputSchema.safeParse({
        url: "https://example.com",
        prompt: "crawl the docs",
      }).success,
    ).toBe(true);
  });
});

describe("previewCrawlParams: governance", () => {
  it("is read-only, non-destructive", () => {
    expect(previewCrawlParamsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(previewCrawlParamsDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("previewCrawlParams: run", () => {
  it("POSTs /v2/crawl/params-preview and returns the unwrapped data", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const derivedParams = {
      url: "https://example.com",
      includePaths: ["/docs/.*"],
      limit: 100,
      sitemap: "include",
    };
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ success: true, data: derivedParams });
    }) as typeof globalThis.fetch;

    const { data: result } = await previewCrawlParamsDefinition.run(
      { url: "https://example.com", prompt: "crawl the docs section" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(
      "https://api.firecrawl.dev/v2/crawl/params-preview",
    );
    expect(calls[0]!.init?.method).toBe("POST");
    const sentBody = JSON.parse(String(calls[0]!.init?.body));
    expect(sentBody).toMatchObject({
      url: "https://example.com",
      prompt: "crawl the docs section",
    });
    // envelope unwrapped: agent sees the derived params directly
    expect(result).toEqual(derivedParams);
  });

  it("throws on a non-2xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Bad Request" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    await expect(
      previewCrawlParamsDefinition.run(
        { url: "https://example.com", prompt: "x" },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow();
  });
});
