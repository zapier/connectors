import { describe, expect, it } from "vitest";

import listProductFieldsDefinition from "../scripts/listProductFields.ts";

const { inputSchema, outputSchema } = listProductFieldsDefinition;

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

describe("listProductFields: inputSchema", () => {
  it("accepts an empty input", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });
});

describe("listProductFields: governance", () => {
  it("is read-only", () => {
    expect(listProductFieldsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listProductFieldsDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("listProductFields: run", () => {
  it("GETs /v1/productFields and unwraps the offset list", async () => {
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
            key: "abc123",
            name: "Stage",
            field_type: "enum",
            options: [
              { id: 1, label: "A" },
              { id: false, label: "No" },
            ],
          },
        ],
        additional_data: { pagination: { next_start: 100 } },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({});
    const { data: result } = await listProductFieldsDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.pipedrive.com/v1/productFields?limit=100",
    );
    expect(calls[0]?.init?.method).toBe("GET");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { next_start: number | null }).next_start).toBe(100);
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Forbidden", error_info: "see docs" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({});
    await expect(
      listProductFieldsDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive listProductFields/);
  });
});
