import { describe, expect, it } from "vitest";

import getDealDefinition from "../scripts/getDeal.ts";

const { inputSchema, outputSchema } = getDealDefinition;

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

describe("getDeal: inputSchema", () => {
  it("accepts a numeric id", () => {
    expect(inputSchema.safeParse({ id: 7 }).success).toBe(true);
  });

  it("requires id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-integer id", () => {
    expect(inputSchema.safeParse({ id: "7" }).success).toBe(false);
  });
});

describe("getDeal: governance", () => {
  it("is read-only", () => {
    expect(getDealDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getDealDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("getDeal: run", () => {
  it("GETs /api/v2/deals/{id} and unwraps the data envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        data: {
          id: 7,
          title: "Acme renewal",
          value: 1200,
          currency: "USD",
          status: "open",
          add_time: "2026-01-01T00:00:00Z",
        },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: 7 });
    const { data: result } = await getDealDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.pipedrive.com/api/v2/deals/7");
    expect(calls[0]?.init?.method).toBe("GET");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { id: number }).id).toBe(7);
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Deal not found", error_info: "see docs" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: 999999 });
    await expect(
      getDealDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive getDeal: Deal not found/);
  });
});
