import { describe, expect, it } from "vitest";

import listIndicesDefinition from "../scripts/listIndices.ts";

const { inputSchema, outputSchema } = listIndicesDefinition;

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
  items: [{ name: "products", entries: 100 }],
  nbPages: 1,
};

describe("listIndices: inputSchema", () => {
  it("accepts an empty input", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("rejects a non-integer page", () => {
    expect(inputSchema.safeParse({ page: 1.5 }).success).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    expect(inputSchema.safeParse({ nope: 1 }).success).toBe(false);
  });
});

describe("listIndices: governance", () => {
  it("is a read tool", () => {
    expect(listIndicesDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listIndicesDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("listIndices: run", () => {
  it("GETs the indexes endpoint and defaults hitsPerPage to 100", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    const { data } = await listIndicesDefinition.run({}, { fetch: fakeFetch });

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]!.url);
    expect(url.origin + url.pathname).toBe(
      "https://application-id.algolia.net/1/indexes",
    );
    expect(url.searchParams.get("hitsPerPage")).toBe("100");
    expect(url.searchParams.has("page")).toBe(false);
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.items).toHaveLength(1);
  });

  it("sets page when provided", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(okBody);
    }) as typeof globalThis.fetch;

    await listIndicesDefinition.run({ page: 2 }, { fetch: fakeFetch });

    const url = new URL(calls[0]!.url);
    expect(url.searchParams.get("page")).toBe("2");
  });

  it("maps a 403 to an ACL-oriented error", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Not enough rights" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await listIndicesDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/ACL|403|permission/i);
  });
});
