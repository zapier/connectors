import { describe, expect, it } from "vitest";

import getCrawlStatusDefinition from "../scripts/getCrawlStatus.ts";

const { inputSchema } = getCrawlStatusDefinition;

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

describe("getCrawlStatus: inputSchema", () => {
  it("requires id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ id: "crawl-123" }).success).toBe(true);
  });
});

describe("getCrawlStatus: governance", () => {
  it("is read-only, non-destructive", () => {
    expect(getCrawlStatusDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getCrawlStatusDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("getCrawlStatus: run", () => {
  it("GETs /v2/crawl/{id} and returns status + data", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        status: "completed",
        total: 2,
        completed: 2,
        data: [{ markdown: "# Page 1" }, { markdown: "# Page 2" }],
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await getCrawlStatusDefinition.run(
      { id: "crawl-123" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.firecrawl.dev/v2/crawl/crawl-123");
    expect(calls[0]!.init?.method).toBe("GET");
    expect(result.status).toBe("completed");
    expect(result.data).toHaveLength(2);
    expect(result.data?.[0]?.markdown).toBe("# Page 1");
  });

  it("throws on a non-2xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Not Found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    await expect(
      getCrawlStatusDefinition.run({ id: "missing" }, { fetch: fakeFetch }),
    ).rejects.toThrow();
  });
});
