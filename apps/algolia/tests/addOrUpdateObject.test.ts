import { describe, expect, it } from "vitest";

import addOrUpdateObjectDefinition from "../scripts/addOrUpdateObject.ts";

const { inputSchema, outputSchema } = addOrUpdateObjectDefinition;

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
  taskID: 99,
  objectID: "obj-1",
  updatedAt: "2026-07-29T00:00:00.000Z",
};

describe("addOrUpdateObject: inputSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(
      inputSchema.safeParse({
        indexName: "products",
        objectID: "obj-1",
        record: { name: "shoe" },
      }).success,
    ).toBe(true);
  });

  it("requires objectID", () => {
    expect(
      inputSchema.safeParse({ indexName: "products", record: {} }).success,
    ).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    expect(
      inputSchema.safeParse({
        indexName: "p",
        objectID: "1",
        record: {},
        nope: 1,
      }).success,
    ).toBe(false);
  });
});

describe("addOrUpdateObject: governance", () => {
  it("is a write (not read-only) and non-destructive", () => {
    expect(addOrUpdateObjectDefinition.annotations?.readOnlyHint).toBe(false);
    expect(addOrUpdateObjectDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("addOrUpdateObject: run", () => {
  it("PUTs the raw record as the body to the object endpoint", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const record = { name: "shoe", price: 10 };
    const { data } = await addOrUpdateObjectDefinition.run(
      { indexName: "products", objectID: "obj-1", record },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products/obj-1",
    );
    expect(calls[0]?.init?.method).toBe("PUT");
    // x-wire-transform unwraps `.record`: the body is the raw record itself.
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual(record);
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.taskID).toBe(99);
    expect(data.objectID).toBe("obj-1");
  });

  it("maps a 403 to an ACL-oriented error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Not enough rights" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await addOrUpdateObjectDefinition
      .run({ indexName: "p", objectID: "1", record: {} }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/ACL|permission|403/i);
  });
});
