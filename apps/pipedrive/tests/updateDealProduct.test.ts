import { describe, expect, it } from "vitest";

import updateDealProductDefinition from "../scripts/updateDealProduct.ts";

const { inputSchema, outputSchema } = updateDealProductDefinition;

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

describe("updateDealProduct: inputSchema", () => {
  it("accepts a minimal valid input (id + product_attachment_id)", () => {
    expect(
      inputSchema.safeParse({ id: 7, product_attachment_id: 100, quantity: 3 })
        .success,
    ).toBe(true);
  });

  it("requires product_attachment_id", () => {
    expect(inputSchema.safeParse({ id: 7, quantity: 3 }).success).toBe(false);
  });

  it("rejects a non-integer product_attachment_id", () => {
    expect(
      inputSchema.safeParse({ id: 7, product_attachment_id: 1.5 }).success,
    ).toBe(false);
  });
});

describe("updateDealProduct: governance", () => {
  it("is a non-destructive write", () => {
    expect(updateDealProductDefinition.annotations?.readOnlyHint).toBe(false);
    expect(updateDealProductDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("updateDealProduct: run", () => {
  it("PATCHes /api/v2/deals/{id}/products/{paid} with the input body and unwraps data", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        data: { id: 100, product_id: 42, quantity: 3, item_price: 150 },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({
      id: 7,
      product_attachment_id: 100,
      quantity: 3,
      item_price: 150,
    });
    const { data: result } = await updateDealProductDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.pipedrive.com/api/v2/deals/7/products/100",
    );
    expect(calls[0]?.init?.method).toBe("PATCH");
    const sent = JSON.parse(calls[0]?.init?.body as string) as {
      quantity: number;
      item_price: number;
    };
    expect(sent.quantity).toBe(3);
    expect(sent.item_price).toBe(150);

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { id: number }).id).toBe(100);
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          success: false,
          error: "line item not found",
          error_info: "see docs",
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({
      id: 7,
      product_attachment_id: 999999,
      quantity: 3,
    });
    await expect(
      updateDealProductDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive updateDealProduct: line item not found/);
  });
});
