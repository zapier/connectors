import { describe, expect, it } from "vitest";

import deleteActivityDefinition from "../scripts/deleteActivity.ts";

const { inputSchema, outputSchema } = deleteActivityDefinition;

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

describe("deleteActivity: inputSchema", () => {
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

describe("deleteActivity: governance", () => {
  it("is a destructive write", () => {
    expect(deleteActivityDefinition.annotations?.readOnlyHint).toBe(false);
    expect(deleteActivityDefinition.annotations?.destructiveHint).toBe(true);
  });
});

describe("deleteActivity: run", () => {
  it("DELETEs /api/v2/activities/{id} and unwraps data", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ success: true, data: { id: 5 } });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: 5 });
    const { data: result } = await deleteActivityDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.pipedrive.com/api/v2/activities/5");
    expect(calls[0]?.init?.method).toBe("DELETE");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { id: number }).id).toBe(5);
  });

  it("throws a tagged error with the status on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Activity not found", error_info: "see docs" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: 999999 });
    await expect(
      deleteActivityDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive deleteActivity: Activity not found/);
  });
});
