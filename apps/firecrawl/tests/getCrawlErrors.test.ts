import { describe, expect, it } from "vitest";

import getCrawlErrorsDefinition from "../scripts/getCrawlErrors.ts";

const { inputSchema } = getCrawlErrorsDefinition;

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

describe("getCrawlErrors: inputSchema", () => {
  it("requires id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ id: "crawl-123" }).success).toBe(true);
  });
});

describe("getCrawlErrors: governance", () => {
  it("is read-only, non-destructive", () => {
    expect(getCrawlErrorsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getCrawlErrorsDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("getCrawlErrors: run", () => {
  it("GETs /v2/crawl/{id}/errors and returns errors + robotsBlocked", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        errors: [{ id: "e1", url: "https://example.com/x", error: "timeout" }],
        robotsBlocked: ["https://example.com/private"],
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await getCrawlErrorsDefinition.run(
      { id: "crawl-123" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(
      "https://api.firecrawl.dev/v2/crawl/crawl-123/errors",
    );
    expect(calls[0]!.init?.method).toBe("GET");
    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]?.error).toBe("timeout");
    expect(result.robotsBlocked).toEqual(["https://example.com/private"]);
  });

  it("throws on a non-2xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Not Found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    await expect(
      getCrawlErrorsDefinition.run({ id: "missing" }, { fetch: fakeFetch }),
    ).rejects.toThrow();
  });
});
