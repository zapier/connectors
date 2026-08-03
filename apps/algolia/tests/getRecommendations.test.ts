import { describe, expect, it } from "vitest";

import getRecommendationsDefinition from "../scripts/getRecommendations.ts";

const { inputSchema, outputSchema } = getRecommendationsDefinition;

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
      hits: [{ objectID: "1", name: "a" }],
      nbHits: 1,
      processingTimeMS: 2,
    },
  ],
};

describe("getRecommendations: inputSchema", () => {
  it("accepts a minimal input (indexName, model)", () => {
    expect(
      inputSchema.safeParse({
        indexName: "products",
        model: "trending-items",
      }).success,
    ).toBe(true);
  });

  it("requires model", () => {
    expect(inputSchema.safeParse({ indexName: "products" }).success).toBe(
      false,
    );
  });

  it("rejects an unknown model value", () => {
    expect(
      inputSchema.safeParse({ indexName: "products", model: "nope" }).success,
    ).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    expect(
      inputSchema.safeParse({
        indexName: "products",
        model: "trending-items",
        nope: 1,
      }).success,
    ).toBe(false);
  });
});

describe("getRecommendations: governance", () => {
  it("is read-only despite being a POST", () => {
    expect(getRecommendationsDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("getRecommendations: conditional validation", () => {
  it("rejects an item model without objectID and does NOT call fetch", async () => {
    let called = false;
    const fakeFetch: typeof globalThis.fetch = (async () => {
      called = true;
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const err = await getRecommendationsDefinition
      .run({ indexName: "i", model: "related-products" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(
      /objectID.*required|required.*objectID/i,
    );
    expect(called).toBe(false);
  });

  it("rejects trending-facets without facetName and does NOT call fetch", async () => {
    let called = false;
    const fakeFetch: typeof globalThis.fetch = (async () => {
      called = true;
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const err = await getRecommendationsDefinition
      .run({ indexName: "i", model: "trending-facets" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(
      /facetName.*required|required.*facetName/i,
    );
    expect(called).toBe(false);
  });

  it("succeeds for trending-items (neither objectID nor facetName required)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(okBody)) as typeof globalThis.fetch;

    const { data } = await getRecommendationsDefinition.run(
      { indexName: "i", model: "trending-items" },
      { fetch: fakeFetch },
    );

    expect(outputSchema.safeParse(data).success).toBe(true);
  });
});

describe("getRecommendations: run", () => {
  it("POSTs the *-recommendations endpoint with the request wrapped in requests[]", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const { data } = await getRecommendationsDefinition.run(
      { indexName: "i", model: "related-products", objectID: "p1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/*/recommendations",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      requests: [
        {
          indexName: "i",
          model: "related-products",
          threshold: 0,
          objectID: "p1",
        },
      ],
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.results[0]?.hits).toHaveLength(1);
  });

  it("maps a 403 to an ACL-oriented error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Not enough rights" },
        {
          status: 403,
        },
      )) as typeof globalThis.fetch;

    const err = await getRecommendationsDefinition
      .run({ indexName: "i", model: "trending-items" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/ACL|403|permission/i);
  });
});
