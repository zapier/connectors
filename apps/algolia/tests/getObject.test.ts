import { describe, expect, it } from "vitest";

import getObjectDefinition from "../scripts/getObject.ts";

const { inputSchema, outputSchema } = getObjectDefinition;

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

const okBody = { objectID: "abc", name: "Sneaker", price: 42 };

describe("getObject: inputSchema", () => {
  it("accepts a minimal input", () => {
    expect(
      inputSchema.safeParse({ indexName: "products", objectID: "abc" }).success,
    ).toBe(true);
  });

  it("requires objectID", () => {
    expect(inputSchema.safeParse({ indexName: "products" }).success).toBe(
      false,
    );
  });

  it("rejects unknown fields (strict)", () => {
    expect(
      inputSchema.safeParse({ indexName: "p", objectID: "abc", nope: 1 })
        .success,
    ).toBe(false);
  });
});

describe("getObject: governance", () => {
  it("is a read tool", () => {
    expect(getObjectDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getObjectDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("getObject: run", () => {
  it("GETs the object endpoint and returns the parsed record", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const { data } = await getObjectDefinition.run(
      { indexName: "products", objectID: "abc" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products/abc",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.objectID).toBe("abc");
  });

  it("sets attributesToRetrieve as a query param when provided", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    await getObjectDefinition.run(
      {
        indexName: "products",
        objectID: "abc",
        attributesToRetrieve: ["name", "price"],
      },
      { fetch: fakeFetch },
    );

    const url = new URL(calls[0]!.url);
    expect(url.searchParams.get("attributesToRetrieve")).toBe("name,price");
  });

  it("maps a 404 to a not-found error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "ObjectID does not exist" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getObjectDefinition
      .run({ indexName: "p", objectID: "missing" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/not found|404/i);
  });
});
