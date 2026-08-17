import { describe, expect, it } from "vitest";

import startAgentDefinition from "../scripts/startAgent.ts";

const { inputSchema } = startAgentDefinition;

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

describe("startAgent: inputSchema", () => {
  it("requires prompt", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ prompt: "find X" }).success).toBe(true);
  });

  it("accepts optional urls, schema, maxCredits, and model", () => {
    const parsed = inputSchema.safeParse({
      prompt: "find X",
      urls: ["https://example.com"],
      schema: { type: "object" },
      maxCredits: 1000,
      model: "spark-1-pro",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("startAgent: governance", () => {
  it("is not read-only (it starts a job)", () => {
    expect(startAgentDefinition.annotations?.readOnlyHint).toBeFalsy();
    expect(startAgentDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("startAgent: run", () => {
  it("POSTs /v2/agent with the body and returns the job id", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ success: true, id: "job_1" });
    }) as typeof globalThis.fetch;

    const { data: result } = await startAgentDefinition.run(
      { prompt: "find X", model: "spark-1-pro" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.firecrawl.dev/v2/agent");
    expect(calls[0]!.init?.method).toBe("POST");
    const sentBody = JSON.parse(String(calls[0]!.init?.body));
    expect(sentBody).toMatchObject({ prompt: "find X", model: "spark-1-pro" });
    expect(result.id).toBe("job_1");
  });

  it("throws on a non-2xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Payment Required" },
        { status: 402 },
      )) as typeof globalThis.fetch;

    await expect(
      startAgentDefinition.run({ prompt: "find X" }, { fetch: fakeFetch }),
    ).rejects.toThrow();
  });
});
