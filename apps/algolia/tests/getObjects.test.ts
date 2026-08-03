import { describe, expect, it } from "vitest";

import getObjectsDefinition from "../scripts/getObjects.ts";

const { inputSchema, outputSchema } = getObjectsDefinition;

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
  results: [{ objectID: "1", name: "a" }],
};

describe("getObjects: inputSchema", () => {
  it("accepts a minimal requests array", () => {
    expect(
      inputSchema.safeParse({
        requests: [{ indexName: "products", objectID: "1" }],
      }).success,
    ).toBe(true);
  });

  it("requires requests", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    expect(
      inputSchema.safeParse({
        requests: [{ indexName: "p", objectID: "1" }],
        nope: 1,
      }).success,
    ).toBe(false);
  });
});

describe("getObjects: governance", () => {
  it("is a read tool", () => {
    expect(getObjectsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getObjectsDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("getObjects: run", () => {
  it("POSTs to the multi-object endpoint with the requests body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const { data } = await getObjectsDefinition.run(
      { requests: [{ indexName: "products", objectID: "1" }] },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/*/objects",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      requests: [{ indexName: "products", objectID: "1" }],
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.results).toHaveLength(1);
  });

  it("maps a 403 to an ACL-oriented error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Not enough rights" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await getObjectsDefinition
      .run(
        { requests: [{ indexName: "p", objectID: "1" }] },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/ACL|403|permission/i);
  });
});
