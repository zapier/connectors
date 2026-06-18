import { describe, expect, it } from "vitest";

import findDocumentsDefinition from "../scripts/findDocuments.ts";

const { inputSchema, outputSchema } = findDocumentsDefinition;

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

const DRIVE_LIST = {
  files: [
    {
      id: "doc-1",
      name: "Quarterly Report",
      webViewLink: "https://docs.google.com/document/d/doc-1/edit",
      modifiedTime: "2026-06-01T12:00:00.000Z",
      createdTime: "2026-05-01T09:00:00.000Z",
    },
    {
      id: "doc-2",
      name: "Quarterly Plan",
      webViewLink: "https://docs.google.com/document/d/doc-2/edit",
      modifiedTime: "2026-06-02T12:00:00.000Z",
      createdTime: "2026-05-02T09:00:00.000Z",
    },
  ],
  nextPageToken: "next-123",
};

describe("findDocuments: inputSchema", () => {
  it("accepts an empty input (all fields optional) and defaults limit to 20", () => {
    const parsed = inputSchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.limit).toBe(20);
  });
});

describe("findDocuments: governance", () => {
  it("is read-only", () => {
    expect(findDocumentsDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("findDocuments: run", () => {
  it("builds the Drive q query and maps fields to the output shape", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(DRIVE_LIST);
    }) as typeof globalThis.fetch;

    const { data: result } = await findDocumentsDefinition.run(
      { name: "Quarterly", limit: 20 },
      { fetch: fakeFetch },
    );

    const parsed = new URL(calls[0]!.url);
    const q = parsed.searchParams.get("q") ?? "";
    expect(q).toContain("mimeType = 'application/vnd.google-apps.document'");
    expect(q).toContain("trashed = false");
    expect(q).toContain("name contains 'Quarterly'");
    expect(parsed.searchParams.get("pageSize")).toBe("20");
    expect(calls[0]?.init?.method).toBe("GET");

    expect(outputSchema.safeParse(result).success).toBe(true);
    // id -> documentId, name -> title, webViewLink -> url.
    expect(result.documents[0]).toEqual({
      documentId: "doc-1",
      title: "Quarterly Report",
      url: "https://docs.google.com/document/d/doc-1/edit",
      modifiedTime: "2026-06-01T12:00:00.000Z",
      createdTime: "2026-05-01T09:00:00.000Z",
    });
    expect(result.documents).toHaveLength(2);
    // nextPageToken passthrough.
    expect(result.nextPageToken).toBe("next-123");
  });

  it("omits the name-contains clause when no name is given", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ files: [] });
    }) as typeof globalThis.fetch;

    await findDocumentsDefinition.run({ limit: 20 }, { fetch: fakeFetch });

    const q = new URL(calls[0]!.url).searchParams.get("q") ?? "";
    expect(q).toContain("mimeType = 'application/vnd.google-apps.document'");
    expect(q).not.toContain("name contains");
  });

  it("threads pageToken into the request and omits nextPageToken when absent", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ files: [] });
    }) as typeof globalThis.fetch;

    const { data: result } = await findDocumentsDefinition.run(
      { limit: 20, pageToken: "prev-page" },
      { fetch: fakeFetch },
    );

    expect(new URL(calls[0]!.url).searchParams.get("pageToken")).toBe(
      "prev-page",
    );
    expect(result.nextPageToken).toBeUndefined();
  });

  it("throws a plain Error on 403", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 403,
            message: "Insufficient permission",
            status: "PERMISSION_DENIED",
          },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await findDocumentsDefinition
      .run({ limit: 20 }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("403");
  });
});
