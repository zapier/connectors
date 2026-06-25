import { describe, expect, it } from "vitest";

import createDocumentDefinition from "../scripts/createDocument.ts";

const { inputSchema, outputSchema } = createDocumentDefinition;

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

interface InsertTextRequest {
  insertText?: { text?: string; location?: { index?: number } };
}

describe("createDocument: inputSchema", () => {
  it("requires title", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ title: "T" }).success).toBe(true);
  });

  it("defaults markdown to false", () => {
    const parsed = inputSchema.parse({ title: "T" });
    expect(parsed.markdown).toBe(false);
  });
});

describe("createDocument: governance", () => {
  it("is a write tool (not read-only)", () => {
    expect(createDocumentDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("createDocument: run", () => {
  it("blank create: POSTs documents and returns id/title/url/revisionId", async () => {
    const calls: Call[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ documentId: "d1", title: "T", revisionId: "r1" });
    }) as typeof globalThis.fetch;

    const { data: result } = await createDocumentDefinition.run(
      { title: "T", markdown: false },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://docs.googleapis.com/v1/documents");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.documentId).toBe("d1");
    expect(result.title).toBe("T");
    expect(result.revisionId).toBe("r1");
    expect(result.url).toBe("https://docs.google.com/document/d/d1/edit");
  });

  it("with plain text: creates then a batchUpdate with insertText at index 1", async () => {
    const calls: Call[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      if (url.includes(":batchUpdate")) return jsonResponse({ replies: [{}] });
      return jsonResponse({ documentId: "d1", title: "T", revisionId: "r1" });
    }) as typeof globalThis.fetch;

    await createDocumentDefinition.run(
      { title: "T", text: "hello", markdown: false },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(2);
    expect(calls[1]?.url).toContain(":batchUpdate");
    const body = JSON.parse(String(calls[1]?.init?.body)) as {
      requests: InsertTextRequest[];
    };
    const insert = body.requests[0]?.insertText;
    expect(insert?.text).toBe("hello");
    expect(insert?.location?.index).toBe(1);
  });

  it("with folder: first call hits Drive files endpoint and documentId comes from Drive", async () => {
    const calls: Call[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "d2" });
    }) as typeof globalThis.fetch;

    const { data: result } = await createDocumentDefinition.run(
      { title: "T", folder: "folder-1", markdown: false },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain("www.googleapis.com/drive/v3/files");
    const body = JSON.parse(String(calls[0]?.init?.body)) as {
      mimeType?: string;
      parents?: string[];
    };
    expect(body.mimeType).toBe("application/vnd.google-apps.document");
    expect(body.parents).toEqual(["folder-1"]);
    expect(result.documentId).toBe("d2");
  });

  it("with markdown: the batchUpdate carries insertText plus styling requests", async () => {
    const calls: Call[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      if (url.includes(":batchUpdate")) return jsonResponse({ replies: [{}] });
      return jsonResponse({ documentId: "d1", title: "T", revisionId: "r1" });
    }) as typeof globalThis.fetch;

    await createDocumentDefinition.run(
      { title: "T", text: "# H\n**b**", markdown: true },
      { fetch: fakeFetch },
    );

    const body = JSON.parse(String(calls[1]?.init?.body)) as {
      requests: Array<Record<string, unknown>>;
    };
    expect(body.requests.length).toBeGreaterThan(1);
    expect(body.requests.some((r) => "insertText" in r)).toBe(true);
    expect(body.requests.some((r) => "updateParagraphStyle" in r)).toBe(true);
    expect(body.requests.some((r) => "updateTextStyle" in r)).toBe(true);
  });

  it("throws a plain Error on a 4xx from the create call", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 400,
            message: "Invalid title.",
            status: "INVALID_ARGUMENT",
          },
        },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await createDocumentDefinition
      .run({ title: "T", markdown: false }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("Invalid title");
  });
});
