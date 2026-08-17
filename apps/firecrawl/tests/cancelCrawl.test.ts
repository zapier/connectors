import { describe, expect, it } from "vitest";

import cancelCrawlDefinition from "../scripts/cancelCrawl.ts";

const { inputSchema } = cancelCrawlDefinition;

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

describe("cancelCrawl: inputSchema", () => {
  it("requires id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ id: "crawl-123" }).success).toBe(true);
  });
});

describe("cancelCrawl: governance", () => {
  it("is non-destructive", () => {
    expect(cancelCrawlDefinition.annotations?.destructiveHint).toBe(false);
    expect(cancelCrawlDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("cancelCrawl: run", () => {
  it("DELETEs /v2/crawl/{id} and returns the cancelled status", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ status: "cancelled" });
    }) as typeof globalThis.fetch;

    const { data: result } = await cancelCrawlDefinition.run(
      { id: "crawl-123" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.firecrawl.dev/v2/crawl/crawl-123");
    expect(calls[0]!.init?.method).toBe("DELETE");
    expect(result.status).toBe("cancelled");
  });

  it("throws on a non-2xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Not Found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    await expect(
      cancelCrawlDefinition.run({ id: "missing" }, { fetch: fakeFetch }),
    ).rejects.toThrow();
  });
});
