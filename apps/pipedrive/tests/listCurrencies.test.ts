import { describe, expect, it } from "vitest";

import listCurrenciesDefinition from "../scripts/listCurrencies.ts";

const { inputSchema, outputSchema } = listCurrenciesDefinition;

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

describe("listCurrencies: inputSchema", () => {
  it("accepts an empty input", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });
});

describe("listCurrencies: governance", () => {
  it("is read-only", () => {
    expect(listCurrenciesDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listCurrenciesDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("listCurrencies: run", () => {
  it("GETs /v1/currencies and unwraps the flat list", async () => {
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
            code: "USD",
            name: "US Dollar",
            symbol: "$",
            decimal_points: 2,
          },
        ],
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({});
    const { data: result } = await listCurrenciesDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.pipedrive.com/v1/currencies");
    expect(calls[0]?.init?.method).toBe("GET");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { items: unknown[] }).items).toHaveLength(1);
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Forbidden", error_info: "see docs" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({});
    await expect(
      listCurrenciesDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive listCurrencies/);
  });
});
