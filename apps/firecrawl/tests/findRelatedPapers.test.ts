import { describe, expect, it } from "vitest";

import findRelatedPapersDefinition from "../scripts/findRelatedPapers.ts";

const { inputSchema } = findRelatedPapersDefinition;

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

const RESULTS = [
  { paperId: "p2", title: "Related Work A", score: 0.9 },
  { paperId: "p3", title: "Related Work B", score: 0.8 },
];

describe("findRelatedPapers: inputSchema", () => {
  it("requires id and intent", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ id: "p1" }).success).toBe(false);
    expect(inputSchema.safeParse({ intent: "similar work" }).success).toBe(
      false,
    );
    expect(
      inputSchema.safeParse({ id: "p1", intent: "similar work" }).success,
    ).toBe(true);
  });

  it("accepts optional mode and k", () => {
    const parsed = inputSchema.safeParse({
      id: "p1",
      intent: "papers citing this",
      mode: "citers",
      k: 10,
    });
    expect(parsed.success).toBe(true);
  });
});

describe("findRelatedPapers: governance", () => {
  it("is read-only, non-destructive", () => {
    expect(findRelatedPapersDefinition.annotations?.readOnlyHint).toBe(true);
    expect(findRelatedPapersDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("findRelatedPapers: run", () => {
  it("GETs /v2/.../{id}/similar with intent, mode, k and returns results", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ success: true, results: RESULTS });
    }) as typeof globalThis.fetch;

    const { data: result } = await findRelatedPapersDefinition.run(
      { id: "p1", intent: "similar work", mode: "citers", k: 10 },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.init?.method).toBe("GET");
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/v2/search/research/papers/p1/similar");
    expect(url.searchParams.get("intent")).toBe("similar work");
    expect(url.searchParams.get("mode")).toBe("citers");
    expect(url.searchParams.get("k")).toBe("10");
    expect(result.results).toEqual(RESULTS);
  });

  it("defaults k to 20 when omitted", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ success: true, results: RESULTS });
    }) as typeof globalThis.fetch;

    await findRelatedPapersDefinition.run(
      { id: "p1", intent: "similar work" },
      { fetch: fakeFetch },
    );

    const url = new URL(calls[0]!.url);
    expect(url.searchParams.get("k")).toBe("20");
  });

  it("throws on a non-2xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Payment Required" },
        { status: 402 },
      )) as typeof globalThis.fetch;

    await expect(
      findRelatedPapersDefinition.run(
        { id: "p1", intent: "similar work" },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow();
  });
});
