import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import searchDefinition from "../scripts/search.ts";

const { inputSchema, outputSchema } = searchDefinition;

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

const RESULTS = {
  results: [
    {
      title: "Result",
      url: "https://ex.example",
      snippet: "snippet",
      date: "2026-01-01",
      last_updated: "2026-02-01",
    },
  ],
  id: "srch_1",
};

describe("search: inputSchema", () => {
  it("requires query", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ query: "ai news" }).success).toBe(true);
  });

  it("caps max_results at 20", () => {
    expect(inputSchema.safeParse({ query: "x", max_results: 25 }).success).toBe(
      false,
    );
  });
});

describe("search: governance", () => {
  it("is read-only despite being a POST", () => {
    expect(searchDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("search: run", () => {
  it("POSTs to /search with the default max_results and a single-line query as a string", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(RESULTS);
    }) as typeof globalThis.fetch;

    const { data } = await searchDefinition.run(
      { query: "latest AI news" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://api.perplexity.ai/search");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      query: "latest AI news",
      max_results: 10,
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.results).toHaveLength(1);
  });

  it("splits a multi-line query into an array (batch)", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(RESULTS);
    }) as typeof globalThis.fetch;

    await searchDefinition.run(
      { query: "first query\nsecond query\n  \nthird" },
      { fetch: fakeFetch },
    );
    expect(JSON.parse(calls[0]?.init?.body as string).query).toEqual([
      "first query",
      "second query",
      "third",
    ]);
  });

  it("loosens ISO dates to MM/DD/YYYY", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(RESULTS);
    }) as typeof globalThis.fetch;

    await searchDefinition.run(
      { query: "x", search_after_date_filter: "2026-03-01" },
      { fetch: fakeFetch },
    );
    expect(
      JSON.parse(calls[0]?.init?.body as string).search_after_date_filter,
    ).toBe("03/01/2026");
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "bad_request", message: "nope" } },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await searchDefinition
      .run({ query: "x" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
