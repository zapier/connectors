import { describe, expect, it } from "vitest";

import getBatchScrapeStatusDefinition from "../scripts/getBatchScrapeStatus.ts";

const { inputSchema } = getBatchScrapeStatusDefinition;

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

describe("getBatchScrapeStatus: inputSchema", () => {
  it("requires id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ id: "job-123" }).success).toBe(true);
  });
});

describe("getBatchScrapeStatus: governance", () => {
  it("is read-only, non-destructive", () => {
    expect(getBatchScrapeStatusDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getBatchScrapeStatusDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("getBatchScrapeStatus: run", () => {
  it("GETs /v2/batch/scrape/{id} and returns the top-level status payload", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        status: "completed",
        total: 2,
        completed: 2,
        data: [{ markdown: "# Page" }],
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await getBatchScrapeStatusDefinition.run(
      { id: "job-123" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(
      "https://api.firecrawl.dev/v2/batch/scrape/job-123",
    );
    expect(calls[0]!.init?.method).toBe("GET");
    expect(result.status).toBe("completed");
    expect(result.data).toHaveLength(1);
  });

  it("throws on a non-2xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Not Found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    await expect(
      getBatchScrapeStatusDefinition.run(
        { id: "missing" },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow();
  });
});
