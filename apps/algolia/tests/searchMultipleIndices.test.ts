import { describe, expect, it } from "vitest";

import searchMultipleIndicesDefinition from "../scripts/searchMultipleIndices.ts";

const { inputSchema, outputSchema } = searchMultipleIndicesDefinition;

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    clone() {
      return this;
    },
    json: async () => body,
  } as unknown as Response;
}

const okBody = {
  results: [
    {
      indexName: "products",
      hits: [{ objectID: "1", name: "a" }],
      nbHits: 1,
      page: 0,
      nbPages: 1,
      processingTimeMS: 1,
    },
  ],
};

describe("searchMultipleIndices: inputSchema", () => {
  it("accepts a minimal requests array", () => {
    expect(
      inputSchema.safeParse({ requests: [{ indexName: "products" }] }).success,
    ).toBe(true);
  });

  it("requires requests", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    expect(
      inputSchema.safeParse({ requests: [{ indexName: "p" }], nope: 1 })
        .success,
    ).toBe(false);
  });
});

describe("searchMultipleIndices: governance", () => {
  it("is a read tool", () => {
    expect(searchMultipleIndicesDefinition.annotations?.readOnlyHint).toBe(
      true,
    );
    expect(searchMultipleIndicesDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("searchMultipleIndices: run", () => {
  it("POSTs to the multi-index queries endpoint with the requests body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const { data } = await searchMultipleIndicesDefinition.run(
      { requests: [{ indexName: "products", query: "shoe" }] },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/*/queries",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      requests: [{ indexName: "products", query: "shoe" }],
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.results).toHaveLength(1);
  });

  it("maps a 403 to an ACL-oriented error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Not enough rights" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await searchMultipleIndicesDefinition
      .run({ requests: [{ indexName: "p" }] }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/ACL|403|permission/i);
  });
});
