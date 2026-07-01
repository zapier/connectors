import { describe, expect, it } from "vitest";

import getFileDefinition from "../scripts/getFile.ts";

const { inputSchema, outputSchema } = getFileDefinition;

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

describe("getFile: inputSchema", () => {
  it("accepts a valid file_id", () => {
    expect(inputSchema.safeParse({ file_id: "abc" }).success).toBe(true);
  });

  it("rejects input missing the required file_id field", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-string file_id", () => {
    expect(inputSchema.safeParse({ file_id: 123 }).success).toBe(false);
  });
});

describe("getFile: outputSchema", () => {
  it("strips download_url — the field was intentionally removed", () => {
    const parsed = outputSchema.safeParse({
      file_id: "a",
      file_unique_id: "b",
      download_url: "x",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect("download_url" in parsed.data).toBe(false);
    }
  });
});

describe("getFile: run", () => {
  it("POSTs to the clean getFile URL and returns the unwrapped file metadata", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        ok: true,
        result: {
          file_id: "abc",
          file_unique_id: "u",
          file_size: 1024,
          file_path: "photos/file_1.jpg",
        },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await getFileDefinition.run(
      { file_id: "abc" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.telegram.org/bot{{bot_token}}/getFile",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      file_id: "abc",
    });

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.file_path).toBe("photos/file_1.jpg");
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

    const err = await getFileDefinition
      .run({ file_id: "abc" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/chat not found/);
  });
});
