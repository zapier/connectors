import { describe, expect, it } from "vitest";

import listBrowserSessionsDefinition from "../scripts/listBrowserSessions.ts";

const { inputSchema } = listBrowserSessionsDefinition;

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

describe("listBrowserSessions: inputSchema", () => {
  it("accepts an empty input and an optional status filter", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
    expect(inputSchema.safeParse({ status: "active" }).success).toBe(true);
    expect(inputSchema.safeParse({ status: "bogus" }).success).toBe(false);
  });
});

describe("listBrowserSessions: governance", () => {
  it("is read-only, non-destructive", () => {
    expect(listBrowserSessionsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listBrowserSessionsDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("listBrowserSessions: run", () => {
  it("GETs /v2/interact with the status query and returns sessions", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        sessions: [{ id: "sess_abc", status: "active" }],
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await listBrowserSessionsDefinition.run(
      { status: "active" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(
      "https://api.firecrawl.dev/v2/interact?status=active",
    );
    expect(calls[0]!.init?.method).toBe("GET");
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]!.id).toBe("sess_abc");
  });
});
