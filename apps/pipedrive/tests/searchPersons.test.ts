import { describe, expect, it } from "vitest";

import searchPersonsDefinition from "../scripts/searchPersons.ts";

const { inputSchema, outputSchema } = searchPersonsDefinition;

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

describe("searchPersons: inputSchema", () => {
  it("accepts a search term", () => {
    expect(inputSchema.safeParse({ term: "ada" }).success).toBe(true);
  });

  it("requires term", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-string term", () => {
    expect(inputSchema.safeParse({ term: 7 }).success).toBe(false);
  });
});

describe("searchPersons: governance", () => {
  it("is read-only", () => {
    expect(searchPersonsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(searchPersonsDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("searchPersons: run", () => {
  it("GETs /api/v2/persons/search and unwraps data.items", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        data: {
          items: [{ result_score: 0.9, item: { id: 1, name: "Ada Lovelace" } }],
        },
        additional_data: { next_cursor: null },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ term: "ada" });
    const { data: result } = await searchPersonsDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.pipedrive.com/api/v2/persons/search?term=ada&limit=20",
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
      searchPersonsDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive searchPersons: Term too short/);
  });
});
