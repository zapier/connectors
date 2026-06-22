import { describe, expect, it } from "vitest";

import listUsersDefinition from "../scripts/listUsers.ts";

const { inputSchema, outputSchema } = listUsersDefinition;

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

describe("listUsers: inputSchema", () => {
  it("accepts an empty input", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });
});

describe("listUsers: governance", () => {
  it("is read-only", () => {
    expect(listUsersDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listUsersDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("listUsers: run", () => {
  it("GETs /v1/users and unwraps the flat list", async () => {
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
            id: 1,
            name: "Ada Lovelace",
            email: "ada@example.com",
            active_flag: true,
            is_admin: true,
          },
        ],
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({});
    const { data: result } = await listUsersDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.pipedrive.com/v1/users");
    expect(calls[0]?.init?.method).toBe("GET");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect((result as { items: unknown[] }).items).toHaveLength(1);
  });

  it("throws a tagged error with the status and Pipedrive message on failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Forbidden", error_info: "see docs" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const input = inputSchema.parse({});
    await expect(
      listUsersDefinition.run(input, { fetch: fakeFetch }),
    ).rejects.toThrow(/Pipedrive listUsers/);
  });
});
