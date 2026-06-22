import { describe, expect, it } from "vitest";

import listOrganizationsDefinition from "../scripts/listOrganizations.ts";

const { inputSchema, outputSchema } = listOrganizationsDefinition;

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

describe("listOrganizations: inputSchema", () => {
  it("accepts an empty object", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts optional filters", () => {
    expect(inputSchema.safeParse({ owner_id: 9, limit: 50 }).success).toBe(
      true,
    );
  });

  it("rejects a non-integer limit", () => {
    expect(inputSchema.safeParse({ limit: "50" }).success).toBe(false);
  });
});

describe("listOrganizations: governance", () => {
  it("is read-only", () => {
    expect(listOrganizationsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listOrganizationsDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("listOrganizations: run", () => {
  it("GETs /api/v2/organizations and unwraps items + next_cursor", async () => {
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
            name: "Acme Inc",
            add_time: "2026-01-01T00:00:00Z",
          },
        ],
        additional_data: { next_cursor: "C1" },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ owner_id: 9 });
    const { data: result } = await listOrganizationsDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.pipedrive.com/api/v2/organizations?owner_id=9&limit=20",
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
      listOrganizationsDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive listOrganizations: Bad request/);
  });
});
