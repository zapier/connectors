import { describe, expect, it } from "vitest";

import getAgentStatusDefinition from "../scripts/getAgentStatus.ts";

const { inputSchema } = getAgentStatusDefinition;

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

describe("getAgentStatus: inputSchema", () => {
  it("requires jobId", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ jobId: "job_1" }).success).toBe(true);
  });
});

describe("getAgentStatus: governance", () => {
  it("is read-only, non-destructive", () => {
    expect(getAgentStatusDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getAgentStatusDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("getAgentStatus: run", () => {
  it("GETs /v2/agent/{jobId} and returns the top-level status shape", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        status: "completed",
        data: { answer: 42 },
        creditsUsed: 3,
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await getAgentStatusDefinition.run(
      { jobId: "job_1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.firecrawl.dev/v2/agent/job_1");
    expect(calls[0]!.init?.method).toBe("GET");
    expect(result.status).toBe("completed");
    expect(result.data).toEqual({ answer: 42 });
  });

  it("throws on a non-2xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Payment Required" },
        { status: 402 },
      )) as typeof globalThis.fetch;

    await expect(
      getAgentStatusDefinition.run({ jobId: "job_1" }, { fetch: fakeFetch }),
    ).rejects.toThrow();
  });
});
