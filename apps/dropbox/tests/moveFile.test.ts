import { describe, expect, it } from "vitest";

import moveFileDefinition from "../scripts/moveFile.ts";

const { inputSchema, outputSchema } = moveFileDefinition;

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

describe("moveFile: governance", () => {
  it("accepts a minimal valid input", () => {
    expect(
      inputSchema.safeParse({
        from_path: "/Inbox/report.pdf",
        to_path: "/Archive/report.pdf",
      }).success,
    ).toBe(true);
  });
});

describe("moveFile: run", () => {
  it("renames .tag to type and sends from_path + to_path in the body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        metadata: {
          ".tag": "file",
          id: "id:1",
          name: "report.pdf",
          path_display: "/Archive/report.pdf",
        },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await moveFileDefinition.run(
      { from_path: "/Inbox/report.pdf", to_path: "/Archive/report.pdf" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://api.dropboxapi.com/2/files/move_v2");
    expect(result.type).toBe("file");
    expect(Object.prototype.hasOwnProperty.call(result, ".tag")).toBe(false);
    expect(outputSchema.safeParse(result).success).toBe(true);

    const body = JSON.parse(calls[0]?.init?.body as string) as Record<
      string,
      unknown
    >;
    expect(body.from_path).toBe("/Inbox/report.pdf");
    expect(body.to_path).toBe("/Archive/report.pdf");
  });

  it("throws a tagged error on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error_summary: "path/not_found/." },
        { status: 409 },
      )) as typeof globalThis.fetch;

    await expect(
      moveFileDefinition.run(
        { from_path: "/a", to_path: "/b" },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow(/Dropbox moveFile/);
  });
});
