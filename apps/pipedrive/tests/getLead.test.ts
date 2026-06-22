import { describe, expect, it } from "vitest";

import getLeadDefinition from "../scripts/getLead.ts";

const { inputSchema, outputSchema } = getLeadDefinition;

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

describe("getLead: inputSchema", () => {
  it("accepts a valid UUID id", () => {
    expect(inputSchema.safeParse({ id: LEAD_UUID }).success).toBe(true);
  });

  it("requires id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-UUID string id", () => {
    expect(inputSchema.safeParse({ id: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects a numeric id (leads are UUIDs, not ints)", () => {
    expect(inputSchema.safeParse({ id: 5 }).success).toBe(false);
  });
});

describe("getLead: governance", () => {
  it("is read-only", () => {
    expect(getLeadDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getLeadDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("getLead: run", () => {
  it("GETs /v1/leads/{uuid} and unwraps data", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        data: {
          id: LEAD_UUID,
          title: "Acme expansion",
          owner_id: 3,
          add_time: "2026-01-01 00:00:00",
        },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: LEAD_UUID });
    const { data: result } = await getLeadDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      `https://api.pipedrive.com/v1/leads/${LEAD_UUID}`,
    );
    expect(calls[0]?.init?.method).toBe("GET");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { id: string }).id).toBe(LEAD_UUID);
    expect((result as { add_time: string }).add_time).toBe(
      "2026-01-01T00:00:00Z",
    );
  });

  it("throws a tagged error with the status on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Lead not found", error_info: "see docs" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: LEAD_UUID });
    await expect(
      getLeadDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive getLead: Lead not found/);
  });
});
