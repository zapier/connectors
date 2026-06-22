import { describe, expect, it } from "vitest";

import listDealsDefinition from "../scripts/listDeals.ts";

const { inputSchema, outputSchema } = listDealsDefinition;

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

describe("listDeals: inputSchema", () => {
  it("accepts an empty input (all filters optional)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a representative filter", () => {
    expect(
      inputSchema.safeParse({ status: "open", pipeline_id: 3 }).success,
    ).toBe(true);
  });

  it("rejects an unknown status enum value", () => {
    expect(inputSchema.safeParse({ status: "archived" }).success).toBe(false);
  });
});

describe("listDeals: governance", () => {
  it("is read-only", () => {
    expect(listDealsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listDealsDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("listDeals: run", () => {
  it("GETs /api/v2/deals and returns items + next_cursor", async () => {
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
            id: 7,
            title: "Acme renewal",
            add_time: "2026-01-01T00:00:00Z",
          },
        ],
        additional_data: { next_cursor: "CURSOR" },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ status: "open" });
    const { data: result } = await listDealsDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain("https://api.pipedrive.com/api/v2/deals");
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
        { success: false, error: "bad filter", error_info: "see docs" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({});
    await expect(
      listDealsDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive listDeals: bad filter/);
  });
});
