import { describe, expect, it } from "vitest";

import clearObjectsDefinition from "../scripts/clearObjects.ts";

const { inputSchema, outputSchema } = clearObjectsDefinition;

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
  taskID: 314,
  updatedAt: "2026-07-29T00:00:00.000Z",
};

describe("clearObjects: inputSchema", () => {
  it("accepts a minimal valid input", () => {
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

describe("clearObjects: governance", () => {
  it("is a write and destructive", () => {
    expect(clearObjectsDefinition.annotations?.readOnlyHint).toBe(false);
    expect(clearObjectsDefinition.annotations?.destructiveHint).toBe(true);
  });
});

describe("clearObjects: run", () => {
  it("POSTs to the clear endpoint and returns the parsed result", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const { data } = await clearObjectsDefinition.run(
      { indexName: "products" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products/clear",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.taskID).toBe(314);
  });

  it("maps a 403 to an ACL-oriented error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Not enough rights" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await clearObjectsDefinition
      .run({ indexName: "p" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/ACL|permission|403/i);
  });
});
