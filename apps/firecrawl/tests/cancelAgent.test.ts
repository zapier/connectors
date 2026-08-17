import { describe, expect, it } from "vitest";

import cancelAgentDefinition from "../scripts/cancelAgent.ts";

const { inputSchema } = cancelAgentDefinition;

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

describe("cancelAgent: inputSchema", () => {
  it("requires jobId", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ jobId: "job_123" }).success).toBe(true);
  });
});

describe("cancelAgent: governance", () => {
  it("is a non-destructive DELETE", () => {
    expect(cancelAgentDefinition.annotations?.destructiveHint).toBe(false);
    expect(cancelAgentDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("cancelAgent: run", () => {
  it("DELETEs /v2/agent/{jobId} and returns the status", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ success: true, status: "cancelled" });
    }) as typeof globalThis.fetch;

    const { data: result } = await cancelAgentDefinition.run(
      { jobId: "job_123" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.firecrawl.dev/v2/agent/job_123");
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
      cancelAgentDefinition.run({ jobId: "missing" }, { fetch: fakeFetch }),
    ).rejects.toThrow();
  });
});
