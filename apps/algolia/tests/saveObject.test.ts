import { describe, expect, it } from "vitest";

import saveObjectDefinition from "../scripts/saveObject.ts";

const { inputSchema, outputSchema } = saveObjectDefinition;

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
  taskID: 42,
  objectID: "abc123",
  createdAt: "2026-07-29T00:00:00.000Z",
};

describe("saveObject: inputSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(
      inputSchema.safeParse({
        indexName: "products",
        record: { objectID: "1", name: "shoe" },
      }).success,
    ).toBe(true);
  });

  it("requires record", () => {
    expect(inputSchema.safeParse({ indexName: "products" }).success).toBe(
      false,
    );
  });

  it("rejects unknown fields (strict)", () => {
    expect(
      inputSchema.safeParse({ indexName: "p", record: {}, nope: 1 }).success,
    ).toBe(false);
  });
});

describe("saveObject: governance", () => {
  it("is a write (not read-only) and non-destructive", () => {
    expect(saveObjectDefinition.annotations?.readOnlyHint).toBe(false);
    expect(saveObjectDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("saveObject: run", () => {
  it("POSTs the raw record as the body and returns the parsed result", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const record = { objectID: "1", name: "shoe", price: 10 };
    const { data } = await saveObjectDefinition.run(
      { indexName: "products", record },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    // x-wire-transform unwraps `.record`: the body is the raw record itself.
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual(record);
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.taskID).toBe(42);
    expect(data.objectID).toBe("abc123");
  });

  it("maps a 403 to an ACL-oriented error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Not enough rights" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await saveObjectDefinition
      .run({ indexName: "p", record: {} }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/ACL|permission|403/i);
  });
});
