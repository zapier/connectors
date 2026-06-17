import { describe, expect, it } from "vitest";

import getMeDefinition from "../scripts/getMe.ts";

const { inputSchema, outputSchema } = getMeDefinition;

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

describe("getMe: inputSchema", () => {
  it("accepts an empty input (no parameters)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });
});

describe("getMe: run", () => {
  it("POSTs to the clean getMe URL and returns the unwrapped bot User", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        ok: true,
        result: { id: 7, is_bot: true, first_name: "Bot", username: "my_bot" },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await getMeDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.telegram.org/getMe");
    expect(calls[0]?.init?.method).toBe("POST");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.is_bot).toBe(true);
  });

  it("throws an Error with an actionable message on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          ok: false,
          error_code: 400,
          description: "Bad Request: chat not found",
        },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await getMeDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/chat not found/);
  });
});
