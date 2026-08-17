import { describe, expect, it } from "vitest";

import getTokenUsageDefinition from "../scripts/getTokenUsage.ts";

const { inputSchema } = getTokenUsageDefinition;

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

describe("getTokenUsage: inputSchema", () => {
  it("accepts empty input (no fields required)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });
});

describe("getTokenUsage: governance", () => {
  it("is read-only, non-destructive", () => {
    expect(getTokenUsageDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getTokenUsageDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("getTokenUsage: run", () => {
  it("GETs /v2/team/token-usage and returns the unwrapped payload", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        data: { remainingTokens: 100, planTokens: 500 },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await getTokenUsageDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.firecrawl.dev/v2/team/token-usage");
    expect(calls[0]!.init?.method).toBe("GET");
    expect(result.remainingTokens).toBe(100);
  });

  it("throws on a non-2xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Payment Required" },
        { status: 402 },
      )) as typeof globalThis.fetch;

    await expect(
      getTokenUsageDefinition.run({}, { fetch: fakeFetch }),
    ).rejects.toThrow();
  });
});
