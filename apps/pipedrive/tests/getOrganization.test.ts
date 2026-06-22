import { describe, expect, it } from "vitest";

import getOrganizationDefinition from "../scripts/getOrganization.ts";

const { inputSchema, outputSchema } = getOrganizationDefinition;

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

describe("getOrganization: inputSchema", () => {
  it("accepts a numeric id", () => {
    expect(inputSchema.safeParse({ id: 1 }).success).toBe(true);
  });

  it("requires id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-integer id", () => {
    expect(inputSchema.safeParse({ id: "1" }).success).toBe(false);
  });
});

describe("getOrganization: governance", () => {
  it("is read-only", () => {
    expect(getOrganizationDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getOrganizationDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("getOrganization: run", () => {
  it("GETs /api/v2/organizations/{id} and unwraps the data envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        data: {
          id: 1,
          name: "Acme Inc",
          add_time: "2026-01-01T00:00:00Z",
        },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: 1 });
    const { data: result } = await getOrganizationDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.pipedrive.com/api/v2/organizations/1",
    );
    expect(calls[0]?.init?.method).toBe("GET");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { id: number }).id).toBe(1);
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          success: false,
          error: "Organization not found",
          error_info: "see docs",
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: 999999 });
    await expect(
      getOrganizationDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive getOrganization: Organization not found/);
  });
});
