import { describe, expect, it } from "vitest";

import getRecommendRuleDefinition from "../scripts/getRecommendRule.ts";

const { inputSchema, outputSchema } = getRecommendRuleDefinition;

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
  objectID: "rule-1",
  condition: { anchoring: "is" },
  consequence: { promote: [{ objectID: "1", position: 0 }] },
  enabled: true,
  description: "a recommend rule",
};

describe("getRecommendRule: inputSchema", () => {
  it("accepts a minimal input (indexName, model, objectID)", () => {
    expect(
      inputSchema.safeParse({
        indexName: "products",
        model: "related-products",
        objectID: "rule-1",
      }).success,
    ).toBe(true);
  });

  it("requires objectID", () => {
    expect(
      inputSchema.safeParse({
        indexName: "products",
        model: "related-products",
      }).success,
    ).toBe(false);
  });

  it("rejects an unknown model value", () => {
    expect(
      inputSchema.safeParse({
        indexName: "products",
        model: "not-a-model",
        objectID: "rule-1",
      }).success,
    ).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    expect(
      inputSchema.safeParse({
        indexName: "products",
        model: "related-products",
        objectID: "rule-1",
        nope: 1,
      }).success,
    ).toBe(false);
  });
});

describe("getRecommendRule: governance", () => {
  it("is read-only", () => {
    expect(getRecommendRuleDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("getRecommendRule: run", () => {
  it("GETs the model-scoped recommend rule endpoint and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const { data } = await getRecommendRuleDefinition.run(
      {
        indexName: "products",
        model: "related-products",
        objectID: "rule-1",
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products/related-products/recommend/rules/rule-1",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.objectID).toBe("rule-1");
  });

  it("maps a 404 to a not-found error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Rule not found" },
        {
          status: 404,
        },
      )) as typeof globalThis.fetch;

    const err = await getRecommendRuleDefinition
      .run(
        { indexName: "p", model: "trending-items", objectID: "missing" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/not found|404/i);
  });
});
