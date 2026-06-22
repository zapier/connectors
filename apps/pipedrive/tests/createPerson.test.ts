import { describe, expect, it } from "vitest";

import createPersonDefinition from "../scripts/createPerson.ts";

const { inputSchema, outputSchema } = createPersonDefinition;

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

describe("createPerson: inputSchema", () => {
  it("accepts a minimal valid input (name only)", () => {
    expect(inputSchema.safeParse({ name: "Ada Lovelace" }).success).toBe(true);
  });

  it("requires name", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-string name", () => {
    expect(inputSchema.safeParse({ name: 7 }).success).toBe(false);
  });
});

describe("createPerson: governance", () => {
  it("is a write (not read-only)", () => {
    expect(createPersonDefinition.annotations?.readOnlyHint).toBe(false);
    expect(createPersonDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("createPerson: run", () => {
  it("POSTs /api/v2/persons, sends the body, and unwraps the data envelope", async () => {
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
          name: "Ada Lovelace",
          add_time: "2026-01-01T00:00:00Z",
        },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ name: "Ada Lovelace", owner_id: 9 });
    const { data: result } = await createPersonDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.pipedrive.com/api/v2/persons");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(String(calls[0]?.init?.body))).toMatchObject({
      name: "Ada Lovelace",
      owner_id: 9,
    });

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { id: number }).id).toBe(1);
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Invalid name", error_info: "see docs" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ name: "x" });
    await expect(
      createPersonDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive createPerson: Invalid name/);
  });
});
