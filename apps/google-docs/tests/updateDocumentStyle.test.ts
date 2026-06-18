import { describe, expect, it } from "vitest";

import updateDocumentStyleDefinition from "../scripts/updateDocumentStyle.ts";

const { inputSchema, outputSchema } = updateDocumentStyleDefinition;

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

interface Call {
  url: string;
  init: RequestInit | undefined;
}

interface UpdateDocumentStyleRequest {
  updateDocumentStyle?: {
    documentStyle?: {
      background?: unknown;
      pageSize?: {
        width?: { magnitude?: number; unit?: string };
        height?: { magnitude?: number; unit?: string };
      };
      marginTop?: { magnitude?: number; unit?: string };
      marginBottom?: { magnitude?: number; unit?: string };
      marginLeft?: { magnitude?: number; unit?: string };
      marginRight?: { magnitude?: number; unit?: string };
      tabId?: string;
    };
    fields?: string;
  };
}

function recordingFetch(calls: Call[]): typeof globalThis.fetch {
  return (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return jsonResponse({ replies: [{}] });
  }) as typeof globalThis.fetch;
}

function requestOf(
  call: Call | undefined,
): UpdateDocumentStyleRequest | undefined {
  const body = JSON.parse(String(call?.init?.body)) as {
    requests: UpdateDocumentStyleRequest[];
  };
  return body.requests[0];
}

describe("updateDocumentStyle: inputSchema", () => {
  it("requires documentId", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ documentId: "d" }).success).toBe(true);
  });
});

describe("updateDocumentStyle: governance", () => {
  it("is a write tool (not read-only)", () => {
    expect(updateDocumentStyleDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("updateDocumentStyle: run", () => {
  it("backgroundColor: #FFFFFF maps to a nested background color and names background in fields", async () => {
    const calls: Call[] = [];
    const fakeFetch = recordingFetch(calls);

    const { data: result } = await updateDocumentStyleDefinition.run(
      { documentId: "d1", backgroundColor: "#FFFFFF" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain(":batchUpdate");
    const req = requestOf(calls[0]);
    expect(req?.updateDocumentStyle?.documentStyle?.background).toEqual({
      color: { color: { rgbColor: { red: 1, green: 1, blue: 1 } } },
    });
    expect(req?.updateDocumentStyle?.fields).toContain("background");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result).toEqual({ documentId: "d1", success: true });
  });

  it("pageWidth/pageHeight map to pageSize with nested field paths", async () => {
    const calls: Call[] = [];
    const fakeFetch = recordingFetch(calls);

    await updateDocumentStyleDefinition.run(
      { documentId: "d1", pageWidth: 612, pageHeight: 792 },
      { fetch: fakeFetch },
    );

    const req = requestOf(calls[0]);
    expect(req?.updateDocumentStyle?.documentStyle?.pageSize?.width).toEqual({
      magnitude: 612,
      unit: "PT",
    });
    expect(req?.updateDocumentStyle?.documentStyle?.pageSize?.height).toEqual({
      magnitude: 792,
      unit: "PT",
    });
    expect(req?.updateDocumentStyle?.fields).toContain("pageSize.width");
    expect(req?.updateDocumentStyle?.fields).toContain("pageSize.height");
  });

  it("margins map to PT magnitudes and name the margin field", async () => {
    const calls: Call[] = [];
    const fakeFetch = recordingFetch(calls);

    await updateDocumentStyleDefinition.run(
      { documentId: "d1", marginTop: 72 },
      { fetch: fakeFetch },
    );

    const req = requestOf(calls[0]);
    expect(req?.updateDocumentStyle?.documentStyle?.marginTop).toEqual({
      magnitude: 72,
      unit: "PT",
    });
    expect(req?.updateDocumentStyle?.fields).toContain("marginTop");
  });

  it("is document-level: the request carries no tabId", async () => {
    const calls: Call[] = [];
    const fakeFetch = recordingFetch(calls);

    await updateDocumentStyleDefinition.run(
      { documentId: "d1", marginLeft: 72 },
      { fetch: fakeFetch },
    );

    expect(
      requestOf(calls[0])?.updateDocumentStyle?.documentStyle?.tabId,
    ).toBeUndefined();
  });

  it("throws without fetching when no style input is provided", async () => {
    const calls: Call[] = [];
    const fakeFetch = recordingFetch(calls);

    const err = await updateDocumentStyleDefinition
      .run({ documentId: "d1" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("at least one");
    expect(calls).toHaveLength(0);
  });

  it("throws without fetching on an unparseable hex color", async () => {
    const calls: Call[] = [];
    const fakeFetch = recordingFetch(calls);

    const err = await updateDocumentStyleDefinition
      .run({ documentId: "d1", backgroundColor: "white" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("Invalid backgroundColor");
    expect(calls).toHaveLength(0);
  });

  it("throws a plain Error on a 403 (view-only)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 403,
            message: "The caller does not have permission",
            status: "PERMISSION_DENIED",
          },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await updateDocumentStyleDefinition
      .run(
        { documentId: "d1", backgroundColor: "#FFFFFF" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("view-only");
  });
});
