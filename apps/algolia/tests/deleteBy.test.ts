import { describe, expect, it } from "vitest";

import deleteByDefinition from "../scripts/deleteBy.ts";

const { inputSchema, outputSchema } = deleteByDefinition;

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
  taskID: 88,
  updatedAt: "2026-07-29T00:00:00.000Z",
};

describe("deleteBy: inputSchema", () => {
  it("accepts a minimal valid input (with a filter)", () => {
    expect(
      inputSchema.safeParse({
        indexName: "products",
        filters: "category:obsolete",
      }).success,
    ).toBe(true);
  });

  it("requires indexName", () => {
    expect(
      inputSchema.safeParse({ filters: "category:obsolete" }).success,
    ).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    expect(inputSchema.safeParse({ indexName: "p", nope: 1 }).success).toBe(
      false,
    );
  });
});

describe("deleteBy: governance", () => {
  it("is a write and destructive", () => {
    expect(deleteByDefinition.annotations?.readOnlyHint).toBe(false);
    expect(deleteByDefinition.annotations?.destructiveHint).toBe(true);
  });
});

describe("deleteBy: run", () => {
  it("rejects when no filters are supplied and never calls fetch (empty-filter guard)", async () => {
    let called = false;
    const fakeFetch: typeof globalThis.fetch = (async () => {
      called = true;
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const err = await deleteByDefinition
      .run({ indexName: "products" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/filter|clearObjects/i);
    expect(called).toBe(false);
  });

  it("POSTs the filter body to deleteByQuery when a filter is provided", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const { data } = await deleteByDefinition.run(
      { indexName: "products", filters: "category:obsolete" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products/deleteByQuery",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      filters: "category:obsolete",
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.taskID).toBe(88);
  });

  it("maps a 403 to an ACL-oriented error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Not enough rights" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await deleteByDefinition
      .run(
        { indexName: "p", filters: "category:obsolete" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/ACL|permission|403/i);
  });
});
