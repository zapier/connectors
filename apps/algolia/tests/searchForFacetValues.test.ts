import { describe, expect, it } from "vitest";

import searchForFacetValuesDefinition from "../scripts/searchForFacetValues.ts";

const { inputSchema, outputSchema } = searchForFacetValuesDefinition;

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
  facetHits: [{ value: "nike", highlighted: "<em>nik</em>e", count: 12 }],
  exhaustiveFacetsCount: true,
};

describe("searchForFacetValues: inputSchema", () => {
  it("accepts a minimal input", () => {
    expect(
      inputSchema.safeParse({ indexName: "products", facetName: "brand" })
        .success,
    ).toBe(true);
  });

  it("requires facetName", () => {
    expect(inputSchema.safeParse({ indexName: "products" }).success).toBe(
      false,
    );
  });

  it("rejects unknown fields (strict)", () => {
    expect(
      inputSchema.safeParse({ indexName: "p", facetName: "brand", nope: 1 })
        .success,
    ).toBe(false);
  });
});

describe("searchForFacetValues: governance", () => {
  it("is a read tool", () => {
    expect(searchForFacetValuesDefinition.annotations?.readOnlyHint).toBe(true);
    expect(searchForFacetValuesDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("searchForFacetValues: run", () => {
  it("POSTs to the facet-query endpoint with the facet body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const { data } = await searchForFacetValuesDefinition.run(
      {
        indexName: "products",
        facetName: "brand",
        facetQuery: "nik",
        maxFacetHits: 5,
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products/facets/brand/query",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      facetQuery: "nik",
      maxFacetHits: 5,
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.facetHits).toHaveLength(1);
  });

  it("maps a 403 to an ACL-oriented error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Not enough rights" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await searchForFacetValuesDefinition
      .run({ indexName: "p", facetName: "brand" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/ACL|403|permission/i);
  });
});
