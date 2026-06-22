import { describe, expect, it } from "vitest";

import createNoteDefinition from "../scripts/createNote.ts";

const { inputSchema, outputSchema } = createNoteDefinition;

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

describe("createNote: inputSchema", () => {
  it("accepts content plus a parent id", () => {
    expect(
      inputSchema.safeParse({ content: "Hello", deal_id: 7 }).success,
    ).toBe(true);
  });

  it("requires content", () => {
    expect(inputSchema.safeParse({ deal_id: 7 }).success).toBe(false);
  });

  it("rejects a non-string content", () => {
    expect(inputSchema.safeParse({ content: 7 }).success).toBe(false);
  });

  it("rejects a payload with no parent id", () => {
    const parsed = inputSchema.safeParse({ content: "Hello" });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe(
      "At least one parent id is required (deal_id, person_id, org_id, or lead_id).",
    );
  });
});

describe("createNote: governance", () => {
  it("is a write (not read-only)", () => {
    expect(createNoteDefinition.annotations?.readOnlyHint).toBe(false);
    expect(createNoteDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("createNote: run", () => {
  it("POSTs /v1/notes with content + parent id in the body and unwraps the record", async () => {
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
          content: "Hello",
          deal_id: 7,
          add_time: "2026-01-01 00:00:00",
        },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ content: "Hello", deal_id: 7 });
    const { data: result } = await createNoteDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.pipedrive.com/v1/notes");
    expect(calls[0]?.init?.method).toBe("POST");
    const sentBody = JSON.parse((calls[0]?.init?.body as string) ?? "{}");
    expect(sentBody.content).toBe("Hello");
    expect(sentBody.deal_id).toBe(7);

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { id: number }).id).toBe(5);
    expect((result as { add_time: string }).add_time).toBe(
      "2026-01-01T00:00:00Z",
    );
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          success: false,
          error: "Content is required",
          error_info: "see docs",
        },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ content: "Hello", deal_id: 7 });
    await expect(
      createNoteDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive createNote: Content is required/);
  });
});
