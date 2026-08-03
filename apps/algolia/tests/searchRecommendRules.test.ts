import { describe, expect, it } from "vitest";

import searchRecommendRulesDefinition from "../scripts/searchRecommendRules.ts";

const { inputSchema, outputSchema } = searchRecommendRulesDefinition;

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
  hits: [
    {
      objectID: "rule-1",
      condition: { anchoring: "is" },
      consequence: { promote: [{ objectID: "1", position: 0 }] },
      enabled: true,
      description: "a recommend rule",
    },
  ],
  nbHits: 1,
};

describe("searchRecommendRules: inputSchema", () => {
  it("accepts a minimal input (indexName, model)", () => {
    expect(
      inputSchema.safeParse({
        indexName: "products",
        model: "related-products",
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
      inputSchema.safeParse({ indexName: "products", model: "not-a-model" })
        .success,
    ).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    expect(
      inputSchema.safeParse({
        indexName: "products",
        model: "related-products",
        nope: 1,
      }).success,
    ).toBe(false);
  });
});

describe("searchRecommendRules: governance", () => {
  it("is read-only despite being a POST", () => {
    expect(searchRecommendRulesDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("searchRecommendRules: run", () => {
  it("POSTs to the model-scoped recommend rules/search endpoint, defaults hitsPerPage to 20", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const { data } = await searchRecommendRulesDefinition.run(
      { indexName: "products", model: "related-products", query: "shoe" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products/related-products/recommend/rules/search",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      query: "shoe",
      hitsPerPage: 20,
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.hits).toHaveLength(1);
  });

  it("maps a 403 to an ACL-oriented error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Not enough rights" },
        {
          status: 403,
        },
      )) as typeof globalThis.fetch;

    const err = await searchRecommendRulesDefinition
      .run({ indexName: "p", model: "trending-items" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/ACL|403|permission/i);
  });
});
