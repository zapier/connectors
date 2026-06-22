import { describe, expect, it } from "vitest";

import updateActivityDefinition from "../scripts/updateActivity.ts";

const { inputSchema, outputSchema } = updateActivityDefinition;

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

describe("updateActivity: inputSchema", () => {
  it("accepts id plus an updated field", () => {
    expect(inputSchema.safeParse({ id: 5, done: true }).success).toBe(true);
  });

  it("requires id", () => {
    expect(inputSchema.safeParse({ done: true }).success).toBe(false);
  });

  it("rejects a non-integer id", () => {
    expect(inputSchema.safeParse({ id: "5" }).success).toBe(false);
  });
});

describe("updateActivity: governance", () => {
  it("is a write (not read-only, not destructive)", () => {
    expect(updateActivityDefinition.annotations?.readOnlyHint).toBe(false);
    expect(updateActivityDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("updateActivity: run", () => {
  it("PATCHes /api/v2/activities/{id} with the body and unwraps data", async () => {
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
          subject: "Call Acme",
          type: "call",
          done: true,
          add_time: "2026-01-01T00:00:00Z",
        },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: 5, done: true });
    const { data: result } = await updateActivityDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.pipedrive.com/api/v2/activities/5");
    expect(calls[0]?.init?.method).toBe("PATCH");
    const sentBody = JSON.parse(String(calls[0]?.init?.body));
    expect(sentBody).toMatchObject({ done: true });
    expect(sentBody).not.toHaveProperty("id");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { done: boolean }).done).toBe(true);
  });

  it("throws a tagged error with the status on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Activity not found", error_info: "see docs" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: 999999, done: true });
    await expect(
      updateActivityDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive updateActivity: Activity not found/);
  });
});
