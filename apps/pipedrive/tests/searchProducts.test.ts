import { describe, expect, it } from "vitest";

import searchProductsDefinition from "../scripts/searchProducts.ts";

const { inputSchema, outputSchema } = searchProductsDefinition;

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

describe("searchProducts: inputSchema", () => {
  it("accepts a term", () => {
    expect(inputSchema.safeParse({ term: "widget" }).success).toBe(true);
  });

  it("requires term", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-string term", () => {
    expect(inputSchema.safeParse({ term: 7 }).success).toBe(false);
  });
});

describe("searchProducts: governance", () => {
  it("is read-only", () => {
    expect(searchProductsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(searchProductsDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("searchProducts: run", () => {
  it("GETs /api/v2/products/search and unwraps data.items + next_cursor", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        data: {
          items: [{ result_score: 0.9, item: { id: 11, name: "Widget" } }],
        },
        additional_data: { next_cursor: "abc123" },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ term: "widget" });
    const { data: result } = await searchProductsDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    const calledUrl = new URL(calls[0]?.url ?? "");
    expect(calledUrl.origin + calledUrl.pathname).toBe(
      "https://api.pipedrive.com/api/v2/products/search",
    );
    expect(calledUrl.searchParams.get("term")).toBe("widget");
    expect(calls[0]?.init?.method).toBe("GET");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { items: unknown[] }).items).toHaveLength(1);
    expect((result as { next_cursor: string | null }).next_cursor).toBe(
      "abc123",
    );
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Term too short", error_info: "see docs" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ term: "widget" });
    await expect(
      searchProductsDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive searchProducts: Term too short/);
  });
});
