import { describe, expect, it } from "vitest";

import createFileRequestDefinition from "../scripts/createFileRequest.ts";

const { inputSchema, outputSchema } = createFileRequestDefinition;

function jsonResponse(
  body: unknown,
  init: {
    status?: number;
    ok?: boolean;
    headers?: Record<string, string>;
  } = {},
): Response {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers(
      init.headers ?? { "content-type": "application/json" },
    ),
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    json: async () => body,
  } as unknown as Response;
}

describe("createFileRequest: governance", () => {
  it("accepts a minimal valid input", () => {
    expect(
      inputSchema.safeParse({ title: "T", destination: "/D" }).success,
    ).toBe(true);
  });
});

describe("createFileRequest: run", () => {
  it("passes the file request through and validates against the output schema", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        id: "fr1",
        url: "https://www.dropbox.com/request/fr1",
        title: "T",
        destination: "/D",
        is_open: true,
        file_count: 0,
      })) as typeof globalThis.fetch;

    const { data: result } = await createFileRequestDefinition.run(
      { title: "T", destination: "/D" },
      { fetch: fakeFetch },
    );

    expect(result.id).toBe("fr1");
    expect(result.url).toBe("https://www.dropbox.com/request/fr1");
    expect(result.title).toBe("T");
    expect(result.destination).toBe("/D");
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("wraps deadline into a struct and defaults open to true", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "fr1",
        url: "https://www.dropbox.com/request/fr1",
        title: "T",
        destination: "/D",
      });
    }) as typeof globalThis.fetch;

    await createFileRequestDefinition.run(
      { title: "T", destination: "/D", deadline: "2026-12-01T00:00:00Z" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.dropboxapi.com/2/file_requests/create",
    );
    const body = JSON.parse(calls[0]?.init?.body as string) as Record<
      string,
      unknown
    >;
    expect(body.deadline).toEqual({ deadline: "2026-12-01T00:00:00Z" });
    expect(body.open).toBe(true);
  });

  it("throws a tagged error on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error_summary: "invalid_account_type/." },
        { status: 409 },
      )) as typeof globalThis.fetch;

    await expect(
      createFileRequestDefinition.run(
        { title: "T", destination: "/D" },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow(/Dropbox createFileRequest/);
  });
});
