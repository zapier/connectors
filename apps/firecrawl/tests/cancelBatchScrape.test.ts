import { describe, expect, it } from "vitest";

import cancelBatchScrapeDefinition from "../scripts/cancelBatchScrape.ts";

const { inputSchema } = cancelBatchScrapeDefinition;

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

describe("cancelBatchScrape: inputSchema", () => {
  it("requires id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ id: "job-123" }).success).toBe(true);
  });
});

describe("cancelBatchScrape: governance", () => {
  it("is a non-destructive write", () => {
    expect(cancelBatchScrapeDefinition.annotations?.readOnlyHint).toBe(false);
    expect(cancelBatchScrapeDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("cancelBatchScrape: run", () => {
  it("DELETEs /v2/batch/scrape/{id} and returns the cancelled status", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ status: "cancelled" });
    }) as typeof globalThis.fetch;

    const { data: result } = await cancelBatchScrapeDefinition.run(
      { id: "job-123" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(
      "https://api.firecrawl.dev/v2/batch/scrape/job-123",
    );
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
      cancelBatchScrapeDefinition.run({ id: "missing" }, { fetch: fakeFetch }),
    ).rejects.toThrow();
  });
});
