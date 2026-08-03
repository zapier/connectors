import { describe, expect, it } from "vitest";

import getTaskDefinition from "../scripts/getTask.ts";

const { inputSchema, outputSchema } = getTaskDefinition;

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

const okBody = { status: "published", pendingTask: false };

describe("getTask: inputSchema", () => {
  it("accepts a minimal input", () => {
    expect(
      inputSchema.safeParse({ indexName: "products", taskID: 12345 }).success,
    ).toBe(true);
  });

  it("requires taskID", () => {
    expect(inputSchema.safeParse({ indexName: "products" }).success).toBe(
      false,
    );
  });

  it("rejects a non-integer taskID", () => {
    expect(
      inputSchema.safeParse({ indexName: "products", taskID: 1.5 }).success,
    ).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    expect(
      inputSchema.safeParse({ indexName: "p", taskID: 1, nope: 1 }).success,
    ).toBe(false);
  });
});

describe("getTask: governance", () => {
  it("is a read tool", () => {
    expect(getTaskDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getTaskDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("getTask: run", () => {
  it("GETs the task endpoint and returns the parsed status", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const { data } = await getTaskDefinition.run(
      { indexName: "products", taskID: 12345 },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://application-id.algolia.net/1/indexes/products/task/12345",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.status).toBe("published");
  });

  it("maps a 404 to a not-found error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "TaskID does not exist" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getTaskDefinition
      .run({ indexName: "p", taskID: 999 }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/not found|404/i);
  });
});
