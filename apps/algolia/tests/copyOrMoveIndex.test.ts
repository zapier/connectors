import { describe, expect, it } from "vitest";

import copyOrMoveIndexDefinition from "../scripts/copyOrMoveIndex.ts";

const { inputSchema, outputSchema } = copyOrMoveIndexDefinition;

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

const okBody = { taskID: 7, updatedAt: "2026-01-01T00:00:00.000Z" };

describe("copyOrMoveIndex: inputSchema", () => {
  it("accepts a minimal input", () => {
    expect(
      inputSchema.safeParse({
        indexName: "products",
        operation: "move",
        destination: "products_v2",
      }).success,
    ).toBe(true);
  });

  it("requires operation and destination", () => {
    expect(inputSchema.safeParse({ indexName: "products" }).success).toBe(
      false,
    );
  });

  it("rejects an invalid operation enum", () => {
    expect(
      inputSchema.safeParse({
        indexName: "products",
        operation: "rename",
        destination: "products_v2",
      }).success,
    ).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    expect(
      inputSchema.safeParse({
        indexName: "p",
        operation: "copy",
        destination: "q",
        nope: 1,
      }).success,
    ).toBe(false);
  });
});

describe("copyOrMoveIndex: governance", () => {
  it("is destructive", () => {
    expect(copyOrMoveIndexDefinition.annotations?.destructiveHint).toBe(true);
    expect(copyOrMoveIndexDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("copyOrMoveIndex: run", () => {
  it("POSTs to the operation endpoint with operation + destination in the body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const { data } = await copyOrMoveIndexDefinition.run(
      {
        indexName: "products",
        operation: "move",
        destination: "products_v2",
        scope: ["settings", "synonyms"],
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products/operation",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      operation: "move",
      destination: "products_v2",
      scope: ["settings", "synonyms"],
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.taskID).toBe(7);
  });

  it("maps a 403 to an ACL-oriented error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Not enough rights" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await copyOrMoveIndexDefinition
      .run(
        { indexName: "p", operation: "copy", destination: "q" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/ACL|403|permission/i);
  });

  it("maps a 404 to a not-found error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Index not found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await copyOrMoveIndexDefinition
      .run(
        { indexName: "p", operation: "copy", destination: "q" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/not found|404/i);
  });
});
