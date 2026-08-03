import { describe, expect, it } from "vitest";

import deleteIndexDefinition from "../scripts/deleteIndex.ts";

const { inputSchema, outputSchema } = deleteIndexDefinition;

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

const okBody = { taskID: 42, deletedAt: "2026-01-01T00:00:00.000Z" };

describe("deleteIndex: inputSchema", () => {
  it("accepts a minimal input", () => {
    expect(inputSchema.safeParse({ indexName: "products" }).success).toBe(true);
  });

  it("requires indexName", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    expect(inputSchema.safeParse({ indexName: "p", nope: 1 }).success).toBe(
      false,
    );
  });
});

describe("deleteIndex: governance", () => {
  it("is destructive", () => {
    expect(deleteIndexDefinition.annotations?.destructiveHint).toBe(true);
    expect(deleteIndexDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("deleteIndex: run", () => {
  it("DELETEs the index endpoint and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const { data } = await deleteIndexDefinition.run(
      { indexName: "products" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products",
    );
    expect(calls[0]?.init?.method).toBe("DELETE");
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.taskID).toBe(42);
  });

  it("maps a 403 to an ACL-oriented error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Not enough rights" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await deleteIndexDefinition
      .run({ indexName: "p" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/ACL|403|permission/i);
  });

  it("maps a 404 to a not-found error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Index does not exist" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await deleteIndexDefinition
      .run({ indexName: "p" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/not found|404/i);
  });
});
