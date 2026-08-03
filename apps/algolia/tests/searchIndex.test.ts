import { describe, expect, it } from "vitest";

import searchIndexDefinition from "../scripts/searchIndex.ts";

const { inputSchema, outputSchema } = searchIndexDefinition;

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
  hits: [{ objectID: "1", name: "a" }],
  nbHits: 1,
  page: 0,
  nbPages: 1,
  hitsPerPage: 20,
  processingTimeMS: 1,
  query: "a",
};

describe("searchIndex: inputSchema", () => {
  it("accepts a minimal query", () => {
    expect(
      inputSchema.safeParse({ indexName: "products", query: "shoe" }).success,
    ).toBe(true);
  });

  it("requires indexName", () => {
    expect(inputSchema.safeParse({ query: "shoe" }).success).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    expect(inputSchema.safeParse({ indexName: "p", nope: 1 }).success).toBe(
      false,
    );
  });
});

describe("searchIndex: governance", () => {
  it("is read-only despite being a POST", () => {
    expect(searchIndexDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("searchIndex: run", () => {
  it("POSTs to the query endpoint, defaults hitsPerPage to 20, returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const { data } = await searchIndexDefinition.run(
      { indexName: "products", query: "shoe" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products/query",
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
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await searchIndexDefinition
      .run({ indexName: "p", query: "x" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/ACL|403|permission/i);
  });
});
