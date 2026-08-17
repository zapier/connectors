import { describe, expect, it } from "vitest";

import getCreditUsageDefinition from "../scripts/getCreditUsage.ts";

const { inputSchema } = getCreditUsageDefinition;

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

describe("getCreditUsage: inputSchema", () => {
  it("accepts empty input (no fields required)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });
});

describe("getCreditUsage: governance", () => {
  it("is read-only, non-destructive", () => {
    expect(getCreditUsageDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getCreditUsageDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("getCreditUsage: run", () => {
  it("GETs /v2/team/credit-usage and returns the unwrapped payload", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        data: { remainingCredits: 100, planCredits: 500 },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await getCreditUsageDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(
      "https://api.firecrawl.dev/v2/team/credit-usage",
    );
    expect(calls[0]!.init?.method).toBe("GET");
    expect(result.remainingCredits).toBe(100);
  });

  it("throws on a non-2xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Payment Required" },
        { status: 402 },
      )) as typeof globalThis.fetch;

    await expect(
      getCreditUsageDefinition.run({}, { fetch: fakeFetch }),
    ).rejects.toThrow();
  });
});
