import { describe, expect, it } from "vitest";

import batchScrapeDefinition from "../scripts/batchScrape.ts";

const { inputSchema } = batchScrapeDefinition;

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

describe("batchScrape: inputSchema", () => {
  it("requires urls", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(
      inputSchema.safeParse({ urls: ["https://a.com", "https://b.com"] })
        .success,
    ).toBe(true);
  });

  it("accepts ignoreInvalidURLs and nested scrapeOptions", () => {
    const parsed = inputSchema.safeParse({
      urls: ["https://a.com"],
      ignoreInvalidURLs: true,
      scrapeOptions: { formats: ["markdown", "html"] },
    });
    expect(parsed.success).toBe(true);
  });
});

describe("batchScrape: governance", () => {
  it("is a POST job-starter — not read-only, non-destructive", () => {
    expect(batchScrapeDefinition.annotations?.readOnlyHint).toBeFalsy();
    expect(batchScrapeDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("batchScrape: run", () => {
  it("POSTs /v2/batch/scrape and returns the job id", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        id: "batch-123",
        url: "https://api.firecrawl.dev/v2/batch/scrape/batch-123",
        invalidURLs: [],
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await batchScrapeDefinition.run(
      { urls: ["https://a.com", "https://b.com"] },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.firecrawl.dev/v2/batch/scrape");
    expect(calls[0]!.init?.method).toBe("POST");
    const sentBody = JSON.parse(String(calls[0]!.init?.body));
    expect(sentBody).toMatchObject({
      urls: ["https://a.com", "https://b.com"],
    });
    expect(result.id).toBe("batch-123");
  });

  it("throws on a non-2xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Payment Required" },
        { status: 402 },
      )) as typeof globalThis.fetch;

    await expect(
      batchScrapeDefinition.run(
        { urls: ["https://a.com"] },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow();
  });
});
