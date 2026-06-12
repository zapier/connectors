import { describe, expect, it } from "vitest";

import listSharedLinksDefinition from "../scripts/listSharedLinks.ts";

const { inputSchema, outputSchema } = listSharedLinksDefinition;

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

describe("listSharedLinks: governance", () => {
  it("flags read-only listing", () => {
    expect(listSharedLinksDefinition.annotations?.readOnlyHint).toBe(true);
  });

  it("accepts an empty input", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });
});

describe("listSharedLinks: run", () => {
  it("maps each link's .tag to type and adds url_download", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        links: [{ ".tag": "file", url: "https://x/f?dl=0" }],
        has_more: false,
      })) as typeof globalThis.fetch;

    const result = await listSharedLinksDefinition.run(
      { path: "/f.txt" },
      { fetch: fakeFetch },
    );

    expect(result.links[0]?.type).toBe("file");
    expect(result.links[0]?.url_download).toBe("https://x/f?dl=1");
    expect(result.has_more).toBe(false);
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("sends a cursor-only body on a continuation page (no path)", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({ links: [], has_more: false });
    }) as typeof globalThis.fetch;

    await listSharedLinksDefinition.run({ cursor: "c1" }, { fetch: fakeFetch });

    const body = JSON.parse(calls[0]?.init?.body as string) as Record<
      string,
      unknown
    >;
    expect(body).toEqual({ cursor: "c1" });
    expect("path" in body).toBe(false);
  });

  it("throws a tagged error on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error_summary: "other/.." },
        { status: 409 },
      )) as typeof globalThis.fetch;

    await expect(
      listSharedLinksDefinition.run({}, { fetch: fakeFetch }),
    ).rejects.toThrow(/Dropbox listSharedLinks/);
  });
});
