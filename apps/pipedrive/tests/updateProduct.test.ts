import { describe, expect, it } from "vitest";

import updateProductDefinition from "../scripts/updateProduct.ts";

const { inputSchema, outputSchema } = updateProductDefinition;

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

describe("updateProduct: inputSchema", () => {
  it("accepts id plus a single changed field", () => {
    expect(inputSchema.safeParse({ id: 11, name: "Renamed" }).success).toBe(
      true,
    );
  });

  it("requires id", () => {
    expect(inputSchema.safeParse({ name: "Renamed" }).success).toBe(false);
  });

  it("rejects a non-integer id", () => {
    expect(inputSchema.safeParse({ id: "11" }).success).toBe(false);
  });
});

describe("updateProduct: governance", () => {
  it("is a write (not read-only)", () => {
    expect(updateProductDefinition.annotations?.readOnlyHint).toBe(false);
    expect(updateProductDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("updateProduct: run", () => {
  it("PATCHes /api/v2/products/{id} with the changed fields and unwraps the record", async () => {
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
          name: "Renamed",
          add_time: "2026-01-01T00:00:00Z",
        },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: 11, name: "Renamed" });
    const { data: result } = await updateProductDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.pipedrive.com/api/v2/products/11");
    expect(calls[0]?.init?.method).toBe("PATCH");
    const sentBody = JSON.parse((calls[0]?.init?.body as string) ?? "{}");
    expect(sentBody.name).toBe("Renamed");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { name: string }).name).toBe("Renamed");
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Product not found", error_info: "see docs" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: 999999, name: "Renamed" });
    await expect(
      updateProductDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive updateProduct: Product not found/);
  });
});
