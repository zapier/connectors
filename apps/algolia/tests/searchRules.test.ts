import { describe, expect, it } from "vitest";

import searchRulesDefinition from "../scripts/searchRules.ts";

const { inputSchema, outputSchema } = searchRulesDefinition;

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
      conditions: [{ pattern: "shoe" }],
      consequence: { params: { query: "x" } },
      description: "a rule",
      enabled: true,
    },
  ],
  nbHits: 1,
};

describe("searchRules: inputSchema", () => {
  it("accepts a minimal input (indexName only)", () => {
    expect(inputSchema.safeParse({ indexName: "products" }).success).toBe(true);
  });

  it("requires indexName", () => {
    expect(inputSchema.safeParse({ query: "shoe" }).success).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    expect(
      inputSchema.safeParse({ indexName: "products", nope: 1 }).success,
    ).toBe(false);
  });
});

describe("searchRules: governance", () => {
  it("is read-only despite being a POST", () => {
    expect(searchRulesDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("searchRules: run", () => {
  it("POSTs to the rules/search endpoint, defaults hitsPerPage to 20, returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const { data } = await searchRulesDefinition.run(
      { indexName: "products", query: "shoe" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products/rules/search",
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

    const err = await searchRulesDefinition
      .run({ indexName: "p" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/ACL|403|permission/i);
  });
});
