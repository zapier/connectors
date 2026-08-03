import { describe, expect, it } from "vitest";

import partialUpdateObjectDefinition from "../scripts/partialUpdateObject.ts";

const { inputSchema, outputSchema } = partialUpdateObjectDefinition;

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
  taskID: 7,
  objectID: "obj-1",
  updatedAt: "2026-07-29T00:00:00.000Z",
};

describe("partialUpdateObject: inputSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(
      inputSchema.safeParse({
        indexName: "products",
        objectID: "obj-1",
        attributes: { price: 5 },
      }).success,
    ).toBe(true);
  });

  it("requires attributes", () => {
    expect(
      inputSchema.safeParse({ indexName: "products", objectID: "obj-1" })
        .success,
    ).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    expect(
      inputSchema.safeParse({
        indexName: "p",
        objectID: "1",
        attributes: {},
        nope: 1,
      }).success,
    ).toBe(false);
  });
});

describe("partialUpdateObject: governance", () => {
  it("is a write (not read-only) and non-destructive", () => {
    expect(partialUpdateObjectDefinition.annotations?.readOnlyHint).toBe(false);
    expect(partialUpdateObjectDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("partialUpdateObject: run", () => {
  it("POSTs the raw attributes as body and sets createIfNotExists as a query param", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const attributes = { price: 5, inStock: true };
    const { data } = await partialUpdateObjectDefinition.run(
      {
        indexName: "products",
        objectID: "obj-1",
        attributes,
        createIfNotExists: false,
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products/obj-1/partial?createIfNotExists=false",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    // Body is the raw attributes object (unwrapped from `.attributes`).
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual(attributes);
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.taskID).toBe(7);
  });

  it("omits the createIfNotExists query param when not provided", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    await partialUpdateObjectDefinition.run(
      { indexName: "products", objectID: "obj-1", attributes: { a: 1 } },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products/obj-1/partial",
    );
  });

  it("maps a 403 to an ACL-oriented error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Not enough rights" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await partialUpdateObjectDefinition
      .run(
        { indexName: "p", objectID: "1", attributes: {} },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/ACL|permission|403/i);
  });
});
