import { describe, expect, it } from "vitest";

import deleteBrowserSessionDefinition from "../scripts/deleteBrowserSession.ts";

const { inputSchema } = deleteBrowserSessionDefinition;

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

describe("deleteBrowserSession: inputSchema", () => {
  it("requires sessionId", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ sessionId: "sess_abc" }).success).toBe(true);
  });
});

describe("deleteBrowserSession: governance", () => {
  it("is a non-destructive DELETE", () => {
    expect(deleteBrowserSessionDefinition.annotations?.destructiveHint).toBe(
      false,
    );
    expect(deleteBrowserSessionDefinition.annotations?.readOnlyHint).toBe(
      false,
    );
  });
});

describe("deleteBrowserSession: run", () => {
  it("DELETEs /v2/interact/{sessionId} and returns billing info", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        sessionDurationMs: 42000,
        creditsBilled: 3,
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await deleteBrowserSessionDefinition.run(
      { sessionId: "sess_abc" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(
      "https://api.firecrawl.dev/v2/interact/sess_abc",
    );
    expect(calls[0]!.init?.method).toBe("DELETE");
    expect(result.sessionDurationMs).toBe(42000);
    expect(result.creditsBilled).toBe(3);
  });
});
