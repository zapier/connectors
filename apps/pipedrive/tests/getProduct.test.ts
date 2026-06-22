import { describe, expect, it } from "vitest";

import getProductDefinition from "../scripts/getProduct.ts";

const { inputSchema, outputSchema } = getProductDefinition;

function jsonResponse(
  body: unknown,
  init: { status?: number; ok?: boolean } = {},
): Response {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

describe("getProduct: inputSchema", () => {
  it("accepts a numeric id", () => {
    expect(inputSchema.safeParse({ id: 11 }).success).toBe(true);
  });

  it("requires id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-integer id", () => {
    expect(inputSchema.safeParse({ id: "11" }).success).toBe(false);
  });
});

describe("getProduct: governance", () => {
  it("is read-only", () => {
    expect(getProductDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getProductDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("getProduct: run", () => {
  it("GETs /api/v2/products/{id} and unwraps the data envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        data: {
          id: 11,
          name: "Widget",
          add_time: "2026-01-01T00:00:00Z",
        },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: 11 });
    const { data: result } = await getProductDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.pipedrive.com/api/v2/products/11");
    expect(calls[0]?.init?.method).toBe("GET");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { id: number }).id).toBe(11);
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Product not found", error_info: "see docs" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: 999999 });
    await expect(
      getProductDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive getProduct: Product not found/);
  });
});
