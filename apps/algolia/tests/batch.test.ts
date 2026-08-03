import { describe, expect, it } from "vitest";

import batchDefinition from "../scripts/batch.ts";

const { inputSchema, outputSchema } = batchDefinition;

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
  taskID: 1234,
  objectIDs: ["a", "b"],
};

const minimalRequests = [
  { action: "addObject" as const, body: { objectID: "a", name: "x" } },
  { action: "deleteObject" as const, body: { objectID: "b" } },
];

describe("batch: inputSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(
      inputSchema.safeParse({
        indexName: "products",
        requests: minimalRequests,
      }).success,
    ).toBe(true);
  });

  it("requires requests", () => {
    expect(inputSchema.safeParse({ indexName: "products" }).success).toBe(
      false,
    );
  });

  it("rejects unknown fields (strict)", () => {
    expect(
      inputSchema.safeParse({
        indexName: "p",
        requests: minimalRequests,
        nope: 1,
      }).success,
    ).toBe(false);
  });
});

describe("batch: governance", () => {
  it("is a write (not read-only) and non-destructive", () => {
    expect(batchDefinition.annotations?.readOnlyHint).toBe(false);
    expect(batchDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("batch: run", () => {
  it("POSTs { requests } to the batch endpoint", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const { data } = await batchDefinition.run(
      { indexName: "products", requests: minimalRequests },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products/batch",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      requests: minimalRequests,
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.taskID).toBe(1234);
  });

  it("maps a 403 to an ACL-oriented error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Not enough rights" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await batchDefinition
      .run({ indexName: "p", requests: minimalRequests }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/ACL|permission|403/i);
  });
});
