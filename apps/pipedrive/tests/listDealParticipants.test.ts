import { describe, expect, it } from "vitest";

import listDealParticipantsDefinition from "../scripts/listDealParticipants.ts";

const { inputSchema, outputSchema } = listDealParticipantsDefinition;

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

describe("listDealParticipants: inputSchema", () => {
  it("accepts a minimal valid input (id only)", () => {
    expect(inputSchema.safeParse({ id: 7 }).success).toBe(true);
  });

  it("requires id", () => {
    expect(inputSchema.safeParse({ start: 0 }).success).toBe(false);
  });

  it("rejects a non-integer id", () => {
    expect(inputSchema.safeParse({ id: "7" }).success).toBe(false);
  });
});

describe("listDealParticipants: governance", () => {
  it("is read-only", () => {
    expect(listDealParticipantsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listDealParticipantsDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("listDealParticipants: run", () => {
  it("GETs the v1 participants endpoint and returns items + next_start", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        data: [{ id: 1, person_id: 42, name: "Jane" }],
        additional_data: { pagination: { next_start: 10 } },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: 7 });
    const { data: result } = await listDealParticipantsDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain(
      "https://api.pipedrive.com/v1/deals/7/participants",
    );
    expect(calls[0]?.init?.method).toBe("GET");

    expect(outputSchema.safeParse(result).success).toBe(true);
    const typed = result as {
      items: unknown[];
      next_start: number | null;
    };
    expect(typed.items).toHaveLength(1);
    expect(typed.next_start).toBe(10);
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Deal not found", error_info: "see docs" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: 999999 });
    await expect(
      listDealParticipantsDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive listDealParticipants: Deal not found/);
  });
});
