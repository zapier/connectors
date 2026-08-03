import { describe, expect, it } from "vitest";

import saveRuleDefinition from "../scripts/saveRule.ts";

const { inputSchema, outputSchema } = saveRuleDefinition;

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

const okBody = { taskID: 42, updatedAt: "2024-01-01T00:00:00.000Z" };

describe("saveRule: inputSchema", () => {
  it("accepts a minimal input (indexName, objectID, consequence)", () => {
    expect(
      inputSchema.safeParse({
        indexName: "products",
        objectID: "rule-1",
        consequence: { params: { query: "x" } },
      }).success,
    ).toBe(true);
  });

  it("requires consequence", () => {
    expect(
      inputSchema.safeParse({ indexName: "products", objectID: "rule-1" })
        .success,
    ).toBe(false);
  });

  it("requires objectID", () => {
    expect(
      inputSchema.safeParse({ indexName: "products", consequence: {} }).success,
    ).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    expect(
      inputSchema.safeParse({
        indexName: "products",
        objectID: "rule-1",
        consequence: {},
        nope: 1,
      }).success,
    ).toBe(false);
  });
});

describe("saveRule: governance", () => {
  it("is a non-destructive write (not read-only, not destructive)", () => {
    expect(saveRuleDefinition.annotations?.readOnlyHint).toBe(false);
    expect(saveRuleDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("saveRule: run", () => {
  it("PUTs to the rule endpoint with the consequence body, returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const consequence = { params: { query: "x" }, hide: [{ objectID: "1" }] };
    const { data } = await saveRuleDefinition.run(
      {
        indexName: "products",
        objectID: "rule-1",
        consequence,
        description: "a rule",
        enabled: true,
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products/rules/rule-1",
    );
    expect(calls[0]?.init?.method).toBe("PUT");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      // objectID must be echoed into the body — Algolia's rules API rejects a
      // rule that omits it, even though it's also in the path (verified live).
      objectID: "rule-1",
      consequence,
      description: "a rule",
      enabled: true,
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.taskID).toBe(42);
  });

  it("sets forwardToReplicas as a query param when provided", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    await saveRuleDefinition.run(
      {
        indexName: "products",
        objectID: "rule-1",
        consequence: {},
        forwardToReplicas: true,
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products/rules/rule-1?forwardToReplicas=true",
    );
  });

  it("maps a 403 to an ACL-oriented error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Not enough rights" },
        {
          status: 403,
        },
      )) as typeof globalThis.fetch;

    const err = await saveRuleDefinition
      .run(
        { indexName: "p", objectID: "r", consequence: {} },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/ACL|403|permission/i);
  });
});
