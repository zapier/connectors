import { describe, expect, it } from "vitest";

import clearSynonymsDefinition from "../scripts/clearSynonyms.ts";

const { inputSchema, outputSchema } = clearSynonymsDefinition;

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

const okBody = { taskID: 33, updatedAt: "2026-01-01T00:00:00.000Z" };

describe("clearSynonyms: inputSchema", () => {
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

describe("clearSynonyms: governance", () => {
  it("is destructive", () => {
    expect(clearSynonymsDefinition.annotations?.destructiveHint).toBe(true);
    expect(clearSynonymsDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("clearSynonyms: run", () => {
  it("POSTs to the synonyms/clear endpoint and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const { data } = await clearSynonymsDefinition.run(
      { indexName: "products" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products/synonyms/clear",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.taskID).toBe(33);
  });

  it("passes forwardToReplicas as a query param", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    await clearSynonymsDefinition.run(
      { indexName: "products", forwardToReplicas: true },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products/synonyms/clear?forwardToReplicas=true",
    );
  });

  it("maps a 403 to an ACL-oriented error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Not enough rights" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await clearSynonymsDefinition
      .run({ indexName: "p" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/ACL|403|permission/i);
  });
});
