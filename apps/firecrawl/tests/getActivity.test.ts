import { describe, expect, it } from "vitest";

import getActivityDefinition from "../scripts/getActivity.ts";

const { inputSchema } = getActivityDefinition;

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

describe("getActivity: inputSchema", () => {
  it("accepts an empty input (all fields optional)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
    expect(inputSchema.safeParse({ endpoint: "crawl", limit: 5 }).success).toBe(
      true,
    );
  });

  it("rejects an unknown endpoint", () => {
    expect(inputSchema.safeParse({ endpoint: "bogus" }).success).toBe(false);
  });
});

describe("getActivity: governance", () => {
  it("is read-only, non-destructive", () => {
    expect(getActivityDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getActivityDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("getActivity: run", () => {
  it("GETs /v2/team/activity with query params and returns the top-level data", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: [{ id: "job-1", endpoint: "crawl" }],
        cursor: "next-cursor",
        has_more: true,
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await getActivityDefinition.run(
      { endpoint: "crawl", cursor: "abc" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const sentUrl = new URL(calls[0]!.url);
    expect(sentUrl.origin + sentUrl.pathname).toBe(
      "https://api.firecrawl.dev/v2/team/activity",
    );
    expect(sentUrl.searchParams.get("endpoint")).toBe("crawl");
    expect(sentUrl.searchParams.get("cursor")).toBe("abc");
    // default limit applied in run()
    expect(sentUrl.searchParams.get("limit")).toBe("20");
    expect(calls[0]!.init?.method).toBe("GET");
    expect(result.data).toHaveLength(1);
    expect(result.cursor).toBe("next-cursor");
  });

  it("throws on a non-2xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      )) as typeof globalThis.fetch;

    await expect(
      getActivityDefinition.run({}, { fetch: fakeFetch }),
    ).rejects.toThrow();
  });
});
