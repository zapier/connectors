import { describe, expect, it } from "vitest";

import deleteDealProductDefinition from "../scripts/deleteDealProduct.ts";

const { inputSchema, outputSchema } = deleteDealProductDefinition;

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

describe("deleteDealProduct: inputSchema", () => {
  it("accepts a valid input (id + product_attachment_id)", () => {
    expect(
      inputSchema.safeParse({ id: 7, product_attachment_id: 100 }).success,
    ).toBe(true);
  });

  it("requires product_attachment_id", () => {
    expect(inputSchema.safeParse({ id: 7 }).success).toBe(false);
  });

  it("rejects a non-integer product_attachment_id", () => {
    expect(
      inputSchema.safeParse({ id: 7, product_attachment_id: "100" }).success,
    ).toBe(false);
  });
});

describe("deleteDealProduct: governance", () => {
  it("is a destructive write", () => {
    expect(deleteDealProductDefinition.annotations?.readOnlyHint).toBe(false);
    expect(deleteDealProductDefinition.annotations?.destructiveHint).toBe(true);
  });
});

describe("deleteDealProduct: run", () => {
  it("DELETEs /api/v2/deals/{id}/products/{paid} and unwraps data", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        data: { id: 100 },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: 7, product_attachment_id: 100 });
    const { data: result } = await deleteDealProductDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.pipedrive.com/api/v2/deals/7/products/100",
    );
    expect(calls[0]?.init?.method).toBe("DELETE");

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

    const input = inputSchema.parse({ id: 7, product_attachment_id: 999999 });
    await expect(
      deleteDealProductDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive deleteDealProduct: line item not found/);
  });
});
