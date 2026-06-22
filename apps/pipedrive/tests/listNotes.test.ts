import { describe, expect, it } from "vitest";

import listNotesDefinition from "../scripts/listNotes.ts";

const { inputSchema, outputSchema } = listNotesDefinition;

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

describe("listNotes: inputSchema", () => {
  it("accepts an empty object (all filters optional)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a deal_id filter", () => {
    expect(inputSchema.safeParse({ deal_id: 7 }).success).toBe(true);
  });

  it("rejects a non-integer deal_id", () => {
    expect(inputSchema.safeParse({ deal_id: "7" }).success).toBe(false);
  });
});

describe("listNotes: governance", () => {
  it("is read-only", () => {
    expect(listNotesDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listNotesDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("listNotes: run", () => {
  it("GETs /v1/notes and unwraps items + next_start (v1 offset pagination)", async () => {
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
            content: "<p>Call notes</p>",
            add_time: "2026-01-01 00:00:00",
          },
        ],
        additional_data: { pagination: { next_start: 10 } },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ deal_id: 7 });
    const { data: result } = await listNotesDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    const calledUrl = new URL(calls[0]?.url ?? "");
    expect(calledUrl.origin + calledUrl.pathname).toBe(
      "https://api.pipedrive.com/v1/notes",
    );
    expect(calledUrl.searchParams.get("deal_id")).toBe("7");
    expect(calls[0]?.init?.method).toBe("GET");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { next_start: number | null }).next_start).toBe(10);
    expect(
      (result as { items: Array<{ add_time: string }> }).items[0]?.add_time,
    ).toBe("2026-01-01T00:00:00Z");
  });

  it("defaults next_start to null when pagination is absent", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        success: true,
        data: [
          { id: 5, content: "<p>x</p>", add_time: "2026-01-01T00:00:00Z" },
        ],
      })) as typeof globalThis.fetch;

    const input = inputSchema.parse({});
    const { data: result } = await listNotesDefinition.run(input, {
      fetch: fakeFetch,
    });
    expect((result as { next_start: number | null }).next_start).toBe(null);
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Bad request", error_info: "see docs" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({});
    await expect(
      listNotesDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive listNotes: Bad request/);
  });
});
