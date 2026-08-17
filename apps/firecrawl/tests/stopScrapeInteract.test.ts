import { describe, expect, it } from "vitest";

import stopScrapeInteractDefinition from "../scripts/stopScrapeInteract.ts";

const { inputSchema } = stopScrapeInteractDefinition;

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

describe("stopScrapeInteract: inputSchema", () => {
  it("requires jobId", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ jobId: "job_1" }).success).toBe(true);
  });
});

describe("stopScrapeInteract: governance", () => {
  it("is a non-destructive DELETE", () => {
    expect(stopScrapeInteractDefinition.annotations?.destructiveHint).toBe(
      false,
    );
    expect(stopScrapeInteractDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("stopScrapeInteract: run", () => {
  it("DELETEs /v2/scrape/{jobId}/interact and returns billing info", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        sessionDurationMs: 15000,
        creditsBilled: 1,
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await stopScrapeInteractDefinition.run(
      { jobId: "job_1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(
      "https://api.firecrawl.dev/v2/scrape/job_1/interact",
    );
    expect(calls[0]!.init?.method).toBe("DELETE");
    expect(result.sessionDurationMs).toBe(15000);
    expect(result.creditsBilled).toBe(1);
  });
});
