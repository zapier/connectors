import { describe, expect, it } from "vitest";

import deleteRuleDefinition from "../scripts/deleteRule.ts";

const { inputSchema, outputSchema } = deleteRuleDefinition;

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

const okBody = { taskID: 99, updatedAt: "2024-01-01T00:00:00.000Z" };

describe("deleteRule: inputSchema", () => {
  it("accepts a minimal input (indexName, objectID)", () => {
    expect(
      inputSchema.safeParse({ indexName: "products", objectID: "rule-1" })
        .success,
    ).toBe(true);
  });

  it("requires objectID", () => {
    expect(inputSchema.safeParse({ indexName: "products" }).success).toBe(
      false,
    );
  });

  it("rejects unknown fields (strict)", () => {
    expect(
      inputSchema.safeParse({
        indexName: "products",
        objectID: "rule-1",
        nope: 1,
      }).success,
    ).toBe(false);
  });
});

describe("deleteRule: governance", () => {
  it("is destructive", () => {
    expect(deleteRuleDefinition.annotations?.destructiveHint).toBe(true);
    expect(deleteRuleDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("deleteRule: run", () => {
  it("DELETEs the rule endpoint and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const { data } = await deleteRuleDefinition.run(
      { indexName: "products", objectID: "rule-1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products/rules/rule-1",
    );
    expect(calls[0]?.init?.method).toBe("DELETE");
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.taskID).toBe(99);
  });

  it("sets forwardToReplicas as a query param when provided", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    await deleteRuleDefinition.run(
      { indexName: "products", objectID: "rule-1", forwardToReplicas: true },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products/rules/rule-1?forwardToReplicas=true",
    );
  });

  it("maps a 404 to a not-found error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "ObjectID does not exist" },
        {
          status: 404,
        },
      )) as typeof globalThis.fetch;

    const err = await deleteRuleDefinition
      .run({ indexName: "p", objectID: "missing" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/not found|404/i);
  });
});
