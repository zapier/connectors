import { describe, expect, it } from "vitest";

import getTemporaryLinkDefinition from "../scripts/getTemporaryLink.ts";

const { outputSchema } = getTemporaryLinkDefinition;

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

describe("getTemporaryLink: governance", () => {
  it("is read-only", () => {
    expect(getTemporaryLinkDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("getTemporaryLink: run", () => {
  it("projects the link plus the nested metadata file fields", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        link: "https://dl/x",
        metadata: {
          name: "f.pdf",
          path_display: "/F.pdf",
          id: "id:1",
          size: 99,
        },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await getTemporaryLinkDefinition.run(
      { path: "/F.pdf" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.dropboxapi.com/2/files/get_temporary_link",
    );
    expect(result).toEqual({
      link: "https://dl/x",
      name: "f.pdf",
      path_display: "/F.pdf",
      id: "id:1",
      size: 99,
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("throws a tagged error on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error_summary: "path/not_found/." },
        { status: 409 },
      )) as typeof globalThis.fetch;

    await expect(
      getTemporaryLinkDefinition.run(
        { path: "/missing" },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow(/Dropbox getTemporaryLink/);
  });
});
