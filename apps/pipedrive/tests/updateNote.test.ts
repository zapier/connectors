import { describe, expect, it } from "vitest";

import updateNoteDefinition from "../scripts/updateNote.ts";

const { inputSchema, outputSchema } = updateNoteDefinition;

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

describe("updateNote: inputSchema", () => {
  it("accepts id plus a changed content field", () => {
    expect(inputSchema.safeParse({ id: 5, content: "Edited" }).success).toBe(
      true,
    );
  });

  it("requires id", () => {
    expect(inputSchema.safeParse({ content: "Edited" }).success).toBe(false);
  });

  it("rejects a non-integer id", () => {
    expect(inputSchema.safeParse({ id: "5" }).success).toBe(false);
  });
});

describe("updateNote: governance", () => {
  it("is a write (not read-only)", () => {
    expect(updateNoteDefinition.annotations?.readOnlyHint).toBe(false);
    expect(updateNoteDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("updateNote: run", () => {
  it("PUTs /v1/notes/{id} (v1 single-record PUT) with the changed fields and unwraps the record", async () => {
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
          content: "Edited",
          add_time: "2026-01-01 00:00:00",
        },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: 5, content: "Edited" });
    const { data: result } = await updateNoteDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.pipedrive.com/v1/notes/5");
    expect(calls[0]?.init?.method).toBe("PUT");
    const sentBody = JSON.parse((calls[0]?.init?.body as string) ?? "{}");
    expect(sentBody.content).toBe("Edited");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { content: string }).content).toBe("Edited");
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

    const input = inputSchema.parse({ id: 999999, content: "Edited" });
    await expect(
      updateNoteDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive updateNote: Note not found/);
  });
});
