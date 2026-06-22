import { describe, expect, it } from "vitest";

import listLeadsDefinition from "../scripts/listLeads.ts";

const { inputSchema, outputSchema } = listLeadsDefinition;

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

describe("listLeads: inputSchema", () => {
  it("accepts no filters (all optional)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a person_id filter and archived_status enum", () => {
    expect(
      inputSchema.safeParse({ person_id: 9, archived_status: "not_archived" })
        .success,
    ).toBe(true);
  });

  it("rejects a bad archived_status value", () => {
    expect(inputSchema.safeParse({ archived_status: "nope" }).success).toBe(
      false,
    );
  });

  it("rejects an unknown key (strict)", () => {
    expect(inputSchema.safeParse({ bogus: 1 }).success).toBe(false);
  });
});

describe("listLeads: governance", () => {
  it("is read-only", () => {
    expect(listLeadsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listLeadsDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("listLeads: run", () => {
  it("GETs /v1/leads and unwraps items + next_start from pagination", async () => {
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
            id: LEAD_UUID,
            title: "Acme expansion",
            owner_id: 3,
            add_time: "2026-01-01 00:00:00",
          },
        ],
        additional_data: { pagination: { next_start: 10 } },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ person_id: 9 });
    const { data: result } = await listLeadsDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]?.url ?? "");
    expect(url.origin + url.pathname).toBe(
      "https://api.pipedrive.com/v1/leads",
    );
    expect(url.searchParams.get("person_id")).toBe("9");
    expect(url.searchParams.get("limit")).toBe("20");
    expect(calls[0]?.init?.method).toBe("GET");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { next_start: number }).next_start).toBe(10);
    expect((result as { items: Array<{ id: string }> }).items[0]?.id).toBe(
      LEAD_UUID,
    );
    expect(
      (result as { items: Array<{ add_time: string }> }).items[0]?.add_time,
    ).toBe("2026-01-01T00:00:00Z");
  });

  it("throws a tagged error with the status on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Bad request", error_info: "see docs" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({});
    await expect(
      listLeadsDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive listLeads: Bad request/);
  });
});
