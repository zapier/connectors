import { describe, expect, it } from "vitest";

import searchPapersDefinition from "../scripts/searchPapers.ts";

const { inputSchema } = searchPapersDefinition;

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
  { paperId: "p1", title: "Diffusion Models", score: 0.9 },
  { paperId: "p2", title: "Attention Is All You Need", score: 0.8 },
];

describe("searchPapers: inputSchema", () => {
  it("requires query", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ query: "" }).success).toBe(false);
    expect(inputSchema.safeParse({ query: "diffusion" }).success).toBe(true);
  });

  it("accepts optional k, authors, categories, and date bounds", () => {
    const parsed = inputSchema.safeParse({
      query: "diffusion",
      k: 10,
      authors: "Ho",
      categories: "cs.LG",
      from: "2020-01-01",
      to: "2021-01-01",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("searchPapers: governance", () => {
  it("is read-only, non-destructive", () => {
    expect(searchPapersDefinition.annotations?.readOnlyHint).toBe(true);
    expect(searchPapersDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("searchPapers: run", () => {
  it("GETs /v2/search/research/papers with query params and returns results", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ success: true, results: RESULTS });
    }) as typeof globalThis.fetch;

    const { data: result } = await searchPapersDefinition.run(
      { query: "diffusion", k: 10 },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.init?.method).toBe("GET");
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/v2/search/research/papers");
    expect(url.searchParams.get("query")).toBe("diffusion");
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

    await searchPapersDefinition.run(
      { query: "diffusion" },
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
      searchPapersDefinition.run({ query: "diffusion" }, { fetch: fakeFetch }),
    ).rejects.toThrow();
  });
});
