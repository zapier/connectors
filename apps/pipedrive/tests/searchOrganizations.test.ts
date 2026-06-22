import { describe, expect, it } from "vitest";

import searchOrganizationsDefinition from "../scripts/searchOrganizations.ts";

const { inputSchema, outputSchema } = searchOrganizationsDefinition;

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

describe("searchOrganizations: inputSchema", () => {
  it("accepts a search term", () => {
    expect(inputSchema.safeParse({ term: "acme" }).success).toBe(true);
  });

  it("requires term", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-string term", () => {
    expect(inputSchema.safeParse({ term: 7 }).success).toBe(false);
  });
});

describe("searchOrganizations: governance", () => {
  it("is read-only", () => {
    expect(searchOrganizationsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(searchOrganizationsDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("searchOrganizations: run", () => {
  it("GETs /api/v2/organizations/search and unwraps data.items", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        data: {
          items: [{ result_score: 0.9, item: { id: 1, name: "Acme Inc" } }],
        },
        additional_data: { next_cursor: null },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ term: "acme" });
    const { data: result } = await searchOrganizationsDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.pipedrive.com/api/v2/organizations/search?term=acme&limit=20",
    );
    expect(calls[0]?.init?.method).toBe("GET");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(
      (result as { items: Array<{ item?: { id: number } }> }).items[0]?.item
        ?.id,
    ).toBe(1);
    expect((result as { next_cursor: string | null }).next_cursor).toBeNull();
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Term too short", error_info: "see docs" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ term: "a" });
    await expect(
      searchOrganizationsDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive searchOrganizations: Term too short/);
  });
});
