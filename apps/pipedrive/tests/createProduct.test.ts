import { describe, expect, it } from "vitest";

import createProductDefinition from "../scripts/createProduct.ts";

const { inputSchema, outputSchema } = createProductDefinition;

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

describe("createProduct: inputSchema", () => {
  it("accepts a minimal payload with only name", () => {
    expect(inputSchema.safeParse({ name: "Widget" }).success).toBe(true);
  });

  it("requires name", () => {
    expect(inputSchema.safeParse({ code: "SKU-1" }).success).toBe(false);
  });

  it("rejects a non-string name", () => {
    expect(inputSchema.safeParse({ name: 7 }).success).toBe(false);
  });
});

describe("createProduct: governance", () => {
  it("is a write (not read-only)", () => {
    expect(createProductDefinition.annotations?.readOnlyHint).toBe(false);
    expect(createProductDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("createProduct: run", () => {
  it("POSTs /api/v2/products with the inputs in the body and unwraps the record", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        data: {
          id: 42,
          name: "Widget",
          add_time: "2026-01-01T00:00:00Z",
        },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ name: "Widget", code: "SKU-1" });
    const { data: result } = await createProductDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.pipedrive.com/api/v2/products");
    expect(calls[0]?.init?.method).toBe("POST");
    const sentBody = JSON.parse((calls[0]?.init?.body as string) ?? "{}");
    expect(sentBody.name).toBe("Widget");
    expect(sentBody.code).toBe("SKU-1");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { id: number }).id).toBe(42);
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Name is required", error_info: "see docs" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ name: "Widget" });
    await expect(
      createProductDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive createProduct: Name is required/);
  });
});
