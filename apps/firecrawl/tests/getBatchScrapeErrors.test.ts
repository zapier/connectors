import { describe, expect, it } from "vitest";

import getBatchScrapeErrorsDefinition from "../scripts/getBatchScrapeErrors.ts";

const { inputSchema } = getBatchScrapeErrorsDefinition;

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

describe("getBatchScrapeErrors: inputSchema", () => {
  it("requires id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ id: "job-123" }).success).toBe(true);
  });
});

describe("getBatchScrapeErrors: governance", () => {
  it("is read-only, non-destructive", () => {
    expect(getBatchScrapeErrorsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getBatchScrapeErrorsDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("getBatchScrapeErrors: run", () => {
  it("GETs /v2/batch/scrape/{id}/errors and returns the top-level payload", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        errors: [{ url: "https://example.com/x", error: "timeout" }],
        robotsBlocked: ["https://example.com/private"],
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await getBatchScrapeErrorsDefinition.run(
      { id: "job-123" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(
      "https://api.firecrawl.dev/v2/batch/scrape/job-123/errors",
    );
    expect(calls[0]!.init?.method).toBe("GET");
    expect(result.errors).toHaveLength(1);
    expect(result.robotsBlocked).toEqual(["https://example.com/private"]);
  });

  it("throws on a non-2xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Not Found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    await expect(
      getBatchScrapeErrorsDefinition.run(
        { id: "missing" },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow();
  });
});
