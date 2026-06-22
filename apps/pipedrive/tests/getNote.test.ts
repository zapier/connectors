import { describe, expect, it } from "vitest";

import getNoteDefinition from "../scripts/getNote.ts";

const { inputSchema, outputSchema } = getNoteDefinition;

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

describe("getNote: inputSchema", () => {
  it("accepts a numeric id", () => {
    expect(inputSchema.safeParse({ id: 5 }).success).toBe(true);
  });

  it("requires id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-integer id", () => {
    expect(inputSchema.safeParse({ id: "5" }).success).toBe(false);
  });
});

describe("getNote: governance", () => {
  it("is read-only", () => {
    expect(getNoteDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getNoteDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("getNote: run", () => {
  it("GETs /v1/notes/{id} and unwraps the data envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        data: {
          id: 5,
          content: "<p>Call notes</p>",
          add_time: "2026-01-01 00:00:00",
        },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: 5 });
    const { data: result } = await getNoteDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.pipedrive.com/v1/notes/5");
    expect(calls[0]?.init?.method).toBe("GET");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { id: number }).id).toBe(5);
    expect((result as { add_time: string }).add_time).toBe(
      "2026-01-01T00:00:00Z",
    );
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Note not found", error_info: "see docs" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: 999999 });
    await expect(
      getNoteDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive getNote: Note not found/);
  });
});
