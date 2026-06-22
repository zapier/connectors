import { describe, expect, it } from "vitest";

import addDealProductDefinition from "../scripts/addDealProduct.ts";

const { inputSchema, outputSchema } = addDealProductDefinition;

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

describe("addDealProduct: inputSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(
      inputSchema.safeParse({
        id: 7,
        product_id: 42,
        item_price: 100,
        quantity: 2,
      }).success,
    ).toBe(true);
  });

  it("requires item_price and quantity", () => {
    expect(inputSchema.safeParse({ id: 7, product_id: 42 }).success).toBe(
      false,
    );
  });

  it("rejects a non-integer product_id", () => {
    expect(
      inputSchema.safeParse({
        id: 7,
        product_id: 1.5,
        item_price: 100,
        quantity: 2,
      }).success,
    ).toBe(false);
  });
});

describe("addDealProduct: governance", () => {
  it("is a non-destructive write", () => {
    expect(addDealProductDefinition.annotations?.readOnlyHint).toBe(false);
    expect(addDealProductDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("addDealProduct: run", () => {
  it("POSTs /api/v2/deals/{id}/products with the input body and unwraps data", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        data: { id: 100, product_id: 42, quantity: 2, item_price: 100 },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({
      id: 7,
      product_id: 42,
      item_price: 100,
      quantity: 2,
    });
    const { data: result } = await addDealProductDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.pipedrive.com/api/v2/deals/7/products",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    const sent = JSON.parse(calls[0]?.init?.body as string) as {
      product_id: number;
      item_price: number;
      quantity: number;
    };
    expect(sent.product_id).toBe(42);
    expect(sent.item_price).toBe(100);
    expect(sent.quantity).toBe(2);

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { id: number }).id).toBe(100);
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "invalid product", error_info: "see docs" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({
      id: 7,
      product_id: 42,
      item_price: 100,
      quantity: 2,
    });
    await expect(
      addDealProductDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive addDealProduct: invalid product/);
  });
});
