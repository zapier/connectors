import { describe, expect, it } from "vitest";

import listDealProductsDefinition from "../scripts/listDealProducts.ts";

const { inputSchema, outputSchema } = listDealProductsDefinition;

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

describe("listDealProducts: inputSchema", () => {
  it("accepts a minimal valid input (id only)", () => {
    expect(inputSchema.safeParse({ id: 7 }).success).toBe(true);
  });

  it("requires id", () => {
    expect(inputSchema.safeParse({ limit: 10 }).success).toBe(false);
  });

  it("rejects a non-integer id", () => {
    expect(inputSchema.safeParse({ id: "7" }).success).toBe(false);
  });
});

describe("listDealProducts: governance", () => {
  it("is read-only", () => {
    expect(listDealProductsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listDealProductsDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("listDealProducts: run", () => {
  it("GETs /api/v2/deals/{id}/products and returns items + next_cursor", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        data: [{ id: 100, product_id: 42, quantity: 2 }],
        additional_data: { next_cursor: "CURSOR" },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: 7 });
    const { data: result } = await listDealProductsDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain(
      "https://api.pipedrive.com/api/v2/deals/7/products",
    );
    expect(calls[0]?.init?.method).toBe("GET");

    expect(outputSchema.safeParse(result).success).toBe(true);
    const typed = result as {
      items: unknown[];
      next_cursor: string | null;
    };
    expect(typed.items).toHaveLength(1);
    expect(typed.next_cursor).toBe("CURSOR");
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Deal not found", error_info: "see docs" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: 999999 });
    await expect(
      listDealProductsDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive listDealProducts: Deal not found/);
  });
});
