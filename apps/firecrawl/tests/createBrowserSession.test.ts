import { describe, expect, it } from "vitest";

import createBrowserSessionDefinition from "../scripts/createBrowserSession.ts";

const { inputSchema } = createBrowserSessionDefinition;

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

describe("createBrowserSession: inputSchema", () => {
  it("accepts an empty input (ttl/activityTtl optional)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
    expect(inputSchema.safeParse({ ttl: 60, activityTtl: 30 }).success).toBe(
      true,
    );
  });
});

describe("createBrowserSession: governance", () => {
  it("is a non-read-only POST", () => {
    expect(
      createBrowserSessionDefinition.annotations?.readOnlyHint,
    ).toBeFalsy();
    expect(createBrowserSessionDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("createBrowserSession: run", () => {
  it("POSTs /v2/interact and returns the session fields", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        id: "sess_abc",
        liveViewUrl: "https://live.example.com/sess_abc",
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await createBrowserSessionDefinition.run(
      { ttl: 120 },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.firecrawl.dev/v2/interact");
    expect(calls[0]!.init?.method).toBe("POST");
    const sentBody = JSON.parse(String(calls[0]!.init?.body));
    expect(sentBody).toMatchObject({ ttl: 120 });
    expect(result.id).toBe("sess_abc");
    expect(result.liveViewUrl).toBe("https://live.example.com/sess_abc");
  });

  it("throws on a non-2xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Payment Required" },
        { status: 402 },
      )) as typeof globalThis.fetch;

    await expect(
      createBrowserSessionDefinition.run({}, { fetch: fakeFetch }),
    ).rejects.toThrow();
  });
});
