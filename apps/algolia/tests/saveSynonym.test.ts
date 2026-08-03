import { describe, expect, it } from "vitest";

import saveSynonymDefinition from "../scripts/saveSynonym.ts";

const { inputSchema, outputSchema } = saveSynonymDefinition;

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
  taskID: 55,
  id: "syn-1",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("saveSynonym: inputSchema", () => {
  it("accepts a minimal input", () => {
    expect(
      inputSchema.safeParse({
        indexName: "products",
        objectID: "syn-1",
        type: "synonym",
      }).success,
    ).toBe(true);
  });

  it("requires objectID and type", () => {
    expect(inputSchema.safeParse({ indexName: "products" }).success).toBe(
      false,
    );
  });

  it("rejects an invalid type enum", () => {
    expect(
      inputSchema.safeParse({
        indexName: "products",
        objectID: "syn-1",
        type: "bogus",
      }).success,
    ).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    expect(
      inputSchema.safeParse({
        indexName: "p",
        objectID: "syn-1",
        type: "synonym",
        nope: 1,
      }).success,
    ).toBe(false);
  });
});

describe("saveSynonym: governance", () => {
  it("is a non-destructive write", () => {
    expect(saveSynonymDefinition.annotations?.readOnlyHint).toBe(false);
    expect(saveSynonymDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("saveSynonym: run", () => {
  it("PUTs to the synonyms/{objectID} endpoint with the synonym body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const { data } = await saveSynonymDefinition.run(
      {
        indexName: "products",
        objectID: "syn-1",
        type: "synonym",
        synonyms: ["phone", "mobile"],
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products/synonyms/syn-1",
    );
    expect(calls[0]?.init?.method).toBe("PUT");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      type: "synonym",
      synonyms: ["phone", "mobile"],
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.taskID).toBe(55);
  });

  it("passes forwardToReplicas as a query param", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    await saveSynonymDefinition.run(
      {
        indexName: "products",
        objectID: "syn-1",
        type: "synonym",
        forwardToReplicas: true,
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products/synonyms/syn-1?forwardToReplicas=true",
    );
  });

  it("maps a 403 to an ACL-oriented error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Not enough rights" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await saveSynonymDefinition
      .run(
        { indexName: "p", objectID: "syn-1", type: "synonym" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/ACL|403|permission/i);
  });
});
