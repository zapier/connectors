import { describe, expect, it } from "vitest";

import getUserDefinition from "../scripts/getUser.ts";

const { inputSchema, outputSchema } = getUserDefinition;

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

describe("getUser: inputSchema", () => {
  it("accepts a numeric id", () => {
    expect(inputSchema.safeParse({ id: 1 }).success).toBe(true);
  });

  it("requires id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });
});

describe("getUser: governance", () => {
  it("is read-only", () => {
    expect(getUserDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getUserDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("getUser: run", () => {
  it("GETs /v1/users/{id} and unwraps the single record", async () => {
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
          email: "ada@example.com",
          active_flag: true,
          is_admin: true,
        },
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: 1 });
    const { data: result } = await getUserDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.pipedrive.com/v1/users/1");
    expect(calls[0]?.init?.method).toBe("GET");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { id: number }).id).toBe(1);
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "User not found", error_info: "see docs" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({ id: 999999 });
    await expect(
      getUserDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive getUser/);
  });
});
