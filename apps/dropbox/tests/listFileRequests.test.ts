import { describe, expect, it } from "vitest";

import listFileRequestsDefinition from "../scripts/listFileRequests.ts";

const { outputSchema } = listFileRequestsDefinition;

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

describe("listFileRequests: governance", () => {
  it("flags read-only listing", () => {
    expect(listFileRequestsDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("listFileRequests: run", () => {
  it("returns the file requests and cursor from the wire", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        file_requests: [{ id: "fr1", url: "u", title: "T", destination: "/D" }],
        cursor: "c",
        has_more: false,
      })) as typeof globalThis.fetch;

    const { data: result } = await listFileRequestsDefinition.run(
      listFileRequestsDefinition.inputSchema.parse({}),
      { fetch: fakeFetch },
    );

    expect(result.file_requests).toHaveLength(1);
    expect(result.cursor).toBe("c");
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("hits list_v2 with a limit body on the first page", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ file_requests: [], has_more: false });
    }) as typeof globalThis.fetch;

    await listFileRequestsDefinition.run(
      listFileRequestsDefinition.inputSchema.parse({}),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url.endsWith("/file_requests/list_v2")).toBe(true);
    const body = JSON.parse(calls[0]?.init?.body as string) as Record<
      string,
      unknown
    >;
    expect(body.limit).toBe(20);
  });

  it("hits the continue endpoint with a cursor-only body on a follow-up page", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ file_requests: [], has_more: false });
    }) as typeof globalThis.fetch;

    await listFileRequestsDefinition.run(
      listFileRequestsDefinition.inputSchema.parse({ cursor: "c1" }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url.endsWith("/file_requests/list/continue")).toBe(true);
    const body = JSON.parse(calls[0]?.init?.body as string) as Record<
      string,
      unknown
    >;
    expect(body).toEqual({ cursor: "c1" });
  });
});
