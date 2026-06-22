import { describe, expect, it } from "vitest";

import listPersonsDefinition from "../scripts/listPersons.ts";

const { inputSchema, outputSchema } = listPersonsDefinition;

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

describe("listPersons: inputSchema", () => {
  it("accepts an empty object", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts optional filters", () => {
    expect(inputSchema.safeParse({ org_id: 5, limit: 50 }).success).toBe(true);
  });

  it("rejects a non-integer limit", () => {
    expect(inputSchema.safeParse({ limit: "50" }).success).toBe(false);
  });
});

describe("listPersons: governance", () => {
  it("is read-only", () => {
    expect(listPersonsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listPersonsDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("listPersons: run", () => {
  it("GETs /api/v2/persons and unwraps items + next_cursor", async () => {
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
            id: 1,
            name: "Ada Lovelace",
            add_time: "2026-01-01T00:00:00Z",
          },
        ],
        additional_data: { next_cursor: "C1" },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ org_id: 5 });
    const { data: result } = await listPersonsDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.pipedrive.com/api/v2/persons?org_id=5&limit=20",
    );
    expect(calls[0]?.init?.method).toBe("GET");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { items: Array<{ id: number }> }).items[0]?.id).toBe(1);
    expect((result as { next_cursor: string | null }).next_cursor).toBe("C1");
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Bad request", error_info: "see docs" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({});
    await expect(
      listPersonsDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive listPersons: Bad request/);
  });
});
