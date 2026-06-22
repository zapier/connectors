import { describe, expect, it } from "vitest";

import searchDealsDefinition from "../scripts/searchDeals.ts";

const { inputSchema, outputSchema } = searchDealsDefinition;

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

describe("searchDeals: inputSchema", () => {
  it("accepts a minimal valid input (term only)", () => {
    expect(inputSchema.safeParse({ term: "acme" }).success).toBe(true);
  });

  it("requires term", () => {
    expect(inputSchema.safeParse({ exact_match: true }).success).toBe(false);
  });

  it("rejects a non-integer person_id", () => {
    expect(
      inputSchema.safeParse({ term: "acme", person_id: 1.5 }).success,
    ).toBe(false);
  });
});

describe("searchDeals: governance", () => {
  it("is read-only", () => {
    expect(searchDealsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(searchDealsDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("searchDeals: run", () => {
  it("GETs /api/v2/deals/search and returns items + next_cursor", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        data: {
          items: [
            {
              result_score: 0.9,
              item: { id: 7, title: "Acme renewal" },
            },
          ],
        },
        additional_data: { next_cursor: null },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ term: "acme" });
    const { data: result } = await searchDealsDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain(
      "https://api.pipedrive.com/api/v2/deals/search",
    );
    expect(calls[0]?.init?.method).toBe("GET");

    expect(outputSchema.safeParse(result).success).toBe(true);
    const typed = result as {
      items: Array<{ item?: { id: number } }>;
      next_cursor: string | null;
    };
    expect(typed.items).toHaveLength(1);
    expect(typed.items[0]?.item?.id).toBe(7);
    expect(typed.next_cursor).toBe(null);
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "term too short", error_info: "see docs" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ term: "a" });
    await expect(
      searchDealsDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive searchDeals: term too short/);
  });
});
