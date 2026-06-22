import { describe, expect, it } from "vitest";

import listProductsDefinition from "../scripts/listProducts.ts";

const { inputSchema, outputSchema } = listProductsDefinition;

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

describe("listProducts: inputSchema", () => {
  it("accepts an empty object (all filters optional)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts owner_id and limit", () => {
    expect(inputSchema.safeParse({ owner_id: 3, limit: 50 }).success).toBe(
      true,
    );
  });

  it("rejects a non-integer owner_id", () => {
    expect(inputSchema.safeParse({ owner_id: "3" }).success).toBe(false);
  });
});

describe("listProducts: governance", () => {
  it("is read-only", () => {
    expect(listProductsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listProductsDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("listProducts: run", () => {
  it("GETs /api/v2/products and unwraps items + next_cursor", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        data: [
          {
            id: 11,
            name: "Widget",
            add_time: "2026-01-01T00:00:00Z",
          },
        ],
        additional_data: { next_cursor: "abc123" },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ owner_id: 3, limit: 50 });
    const { data: result } = await listProductsDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    const calledUrl = new URL(calls[0]?.url ?? "");
    expect(calledUrl.origin + calledUrl.pathname).toBe(
      "https://api.pipedrive.com/api/v2/products",
    );
    expect(calledUrl.searchParams.get("owner_id")).toBe("3");
    expect(calledUrl.searchParams.get("limit")).toBe("50");
    expect(calls[0]?.init?.method).toBe("GET");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { next_cursor: string | null }).next_cursor).toBe(
      "abc123",
    );
  });

  it("defaults next_cursor to null when additional_data is absent", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        success: true,
        data: [{ id: 11, name: "Widget", add_time: "2026-01-01T00:00:00Z" }],
      })) as typeof globalThis.fetch;

    const input = inputSchema.parse({});
    const { data: result } = await listProductsDefinition.run(input, {
      fetch: fakeFetch,
    });
    expect((result as { next_cursor: string | null }).next_cursor).toBe(null);
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Bad request", error_info: "see docs" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({});
    await expect(
      listProductsDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive listProducts: Bad request/);
  });
});
