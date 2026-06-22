import { describe, expect, it } from "vitest";

import updatePersonDefinition from "../scripts/updatePerson.ts";

const { inputSchema, outputSchema } = updatePersonDefinition;

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

describe("updatePerson: inputSchema", () => {
  it("accepts an id with a field to change", () => {
    expect(inputSchema.safeParse({ id: 1, name: "New Name" }).success).toBe(
      true,
    );
  });

  it("requires id", () => {
    expect(inputSchema.safeParse({ name: "New Name" }).success).toBe(false);
  });

  it("rejects a non-integer id", () => {
    expect(inputSchema.safeParse({ id: "1" }).success).toBe(false);
  });
});

describe("updatePerson: governance", () => {
  it("is a write (not read-only)", () => {
    expect(updatePersonDefinition.annotations?.readOnlyHint).toBe(false);
    expect(updatePersonDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("updatePerson: run", () => {
  it("PATCHes /api/v2/persons/{id}, sends the body, and unwraps the data envelope", async () => {
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
          name: "New Name",
          add_time: "2026-01-01T00:00:00Z",
        },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: 1, name: "New Name" });
    const { data: result } = await updatePersonDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.pipedrive.com/api/v2/persons/1");
    expect(calls[0]?.init?.method).toBe("PATCH");
    expect(JSON.parse(String(calls[0]?.init?.body))).toMatchObject({
      name: "New Name",
    });

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { name: string }).name).toBe("New Name");
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Person not found", error_info: "see docs" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: 999999, name: "x" });
    await expect(
      updatePersonDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive updatePerson: Person not found/);
  });
});
