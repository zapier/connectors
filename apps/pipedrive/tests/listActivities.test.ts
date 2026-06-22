import { describe, expect, it } from "vitest";

import listActivitiesDefinition from "../scripts/listActivities.ts";

const { inputSchema, outputSchema } = listActivitiesDefinition;

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

describe("listActivities: inputSchema", () => {
  it("accepts no filters (all optional)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a deal_id filter", () => {
    expect(inputSchema.safeParse({ deal_id: 12 }).success).toBe(true);
  });

  it("rejects a non-integer deal_id", () => {
    expect(inputSchema.safeParse({ deal_id: "12" }).success).toBe(false);
  });

  it("rejects an unknown key (strict)", () => {
    expect(inputSchema.safeParse({ bogus: 1 }).success).toBe(false);
  });
});

describe("listActivities: governance", () => {
  it("is read-only", () => {
    expect(listActivitiesDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listActivitiesDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("listActivities: run", () => {
  it("GETs /api/v2/activities and unwraps items + next_cursor", async () => {
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
            id: 5,
            subject: "Call Acme",
            type: "call",
            done: false,
            add_time: "2026-01-01T00:00:00Z",
          },
        ],
        additional_data: { next_cursor: "C1" },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ deal_id: 12, limit: 1 });
    const { data: result } = await listActivitiesDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]?.url ?? "");
    expect(url.origin + url.pathname).toBe(
      "https://api.pipedrive.com/api/v2/activities",
    );
    expect(url.searchParams.get("deal_id")).toBe("12");
    expect(url.searchParams.get("limit")).toBe("1");
    expect(calls[0]?.init?.method).toBe("GET");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { next_cursor: string }).next_cursor).toBe("C1");
  });

  it("defaults limit to 20 when omitted", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ success: true, data: [], additional_data: {} });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({});
    await listActivitiesDefinition.run(input, { fetch: fakeFetch });

    const url = new URL(calls[0]?.url ?? "");
    expect(url.searchParams.get("limit")).toBe("20");
  });

  it("throws a tagged error with the status on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Bad request", error_info: "see docs" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({});
    await expect(
      listActivitiesDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive listActivities: Bad request/);
  });
});
