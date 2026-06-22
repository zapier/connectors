import { describe, expect, it } from "vitest";

import searchLeadsDefinition from "../scripts/searchLeads.ts";

const { inputSchema, outputSchema } = searchLeadsDefinition;

const LEAD_UUID = "adf21080-0e10-11e9-9a1f-3b9a8c3a1f00";

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

describe("searchLeads: inputSchema", () => {
  it("accepts a minimal term", () => {
    expect(inputSchema.safeParse({ term: "acme" }).success).toBe(true);
  });

  it("requires term", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-boolean exact_match", () => {
    expect(
      inputSchema.safeParse({ term: "acme", exact_match: "yes" }).success,
    ).toBe(false);
  });

  it("rejects an unknown key (strict)", () => {
    expect(inputSchema.safeParse({ term: "acme", bogus: 1 }).success).toBe(
      false,
    );
  });
});

describe("searchLeads: governance", () => {
  it("is read-only", () => {
    expect(searchLeadsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(searchLeadsDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("searchLeads: run", () => {
  it("GETs /v1/leads/search and unwraps data.items + next_start", async () => {
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
              item: { id: LEAD_UUID, title: "Acme expansion" },
            },
          ],
        },
        additional_data: { pagination: { next_start: 10 } },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ term: "acme" });
    const { data: result } = await searchLeadsDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]?.url ?? "");
    expect(url.origin + url.pathname).toBe(
      "https://api.pipedrive.com/v1/leads/search",
    );
    expect(url.searchParams.get("term")).toBe("acme");
    expect(url.searchParams.get("limit")).toBe("20");
    expect(calls[0]?.init?.method).toBe("GET");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { next_start: number }).next_start).toBe(10);
    expect(
      (result as { items: Array<{ item: { id: string } }> }).items[0]?.item.id,
    ).toBe(LEAD_UUID);
  });

  it("throws a tagged error with the status on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Bad request", error_info: "see docs" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ term: "acme" });
    await expect(
      searchLeadsDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive searchLeads: Bad request/);
  });
});
