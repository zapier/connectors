import { describe, expect, it } from "vitest";

import getSynonymDefinition from "../scripts/getSynonym.ts";

const { inputSchema, outputSchema } = getSynonymDefinition;

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
  objectID: "syn-1",
  type: "synonym",
  synonyms: ["phone", "mobile"],
};

describe("getSynonym: inputSchema", () => {
  it("accepts a minimal input", () => {
    expect(
      inputSchema.safeParse({ indexName: "products", objectID: "syn-1" })
        .success,
    ).toBe(true);
  });

  it("requires objectID", () => {
    expect(inputSchema.safeParse({ indexName: "products" }).success).toBe(
      false,
    );
  });

  it("rejects unknown fields (strict)", () => {
    expect(
      inputSchema.safeParse({ indexName: "p", objectID: "syn-1", nope: 1 })
        .success,
    ).toBe(false);
  });
});

describe("getSynonym: governance", () => {
  it("is read-only", () => {
    expect(getSynonymDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getSynonymDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("getSynonym: run", () => {
  it("GETs the synonyms/{objectID} endpoint and returns the parsed synonym", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const { data } = await getSynonymDefinition.run(
      { indexName: "products", objectID: "syn-1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products/synonyms/syn-1",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.objectID).toBe("syn-1");
  });

  it("maps a 404 to a not-found error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Synonym set does not exist" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getSynonymDefinition
      .run({ indexName: "p", objectID: "missing" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/not found|404/i);
  });
});
