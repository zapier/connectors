import { describe, expect, it } from "vitest";

import multipleBatchDefinition from "../scripts/multipleBatch.ts";

const { inputSchema, outputSchema } = multipleBatchDefinition;

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
  taskID: { products: 1, categories: 2 },
  objectIDs: ["a", "b"],
};

const minimalRequests = [
  {
    action: "addObject" as const,
    indexName: "products",
    body: { objectID: "a", name: "x" },
  },
  {
    action: "deleteObject" as const,
    indexName: "categories",
    body: { objectID: "b" },
  },
];

describe("multipleBatch: inputSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(inputSchema.safeParse({ requests: minimalRequests }).success).toBe(
      true,
    );
  });

  it("requires requests", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    expect(
      inputSchema.safeParse({ requests: minimalRequests, nope: 1 }).success,
    ).toBe(false);
  });
});

describe("multipleBatch: governance", () => {
  it("is a write (not read-only) and non-destructive", () => {
    expect(multipleBatchDefinition.annotations?.readOnlyHint).toBe(false);
    expect(multipleBatchDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("multipleBatch: run", () => {
  it("POSTs { requests } to the cross-index batch endpoint", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const { data } = await multipleBatchDefinition.run(
      { requests: minimalRequests },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/*/batch",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      requests: minimalRequests,
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.taskID).toEqual({ products: 1, categories: 2 });
  });

  it("maps a 403 to an ACL-oriented error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Not enough rights" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await multipleBatchDefinition
      .run({ requests: minimalRequests }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/ACL|permission|403/i);
  });
});
