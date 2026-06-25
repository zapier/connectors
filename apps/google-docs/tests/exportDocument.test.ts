import { describe, expect, it } from "vitest";

import exportDocumentDefinition from "../scripts/exportDocument.ts";

const { inputSchema, outputSchema } = exportDocumentDefinition;

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

// The export endpoint returns the rendered content via res.text() (NOT JSON).
function textResponse(
  content: string,
  init: { status?: number } = {},
): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "content-type": "text/plain" }),
    text: async () => content,
  } as unknown as Response;
}

describe("exportDocument: inputSchema", () => {
  it("requires documentId and defaults format to text", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    const parsed = inputSchema.safeParse({ documentId: "doc-1" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.format).toBe("text");
  });
});

describe("exportDocument: governance", () => {
  it("is read-only", () => {
    expect(exportDocumentDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("exportDocument: run", () => {
  it("defaults to text/plain and returns the raw string content", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return textResponse("Plain body text.");
    }) as typeof globalThis.fetch;

    const { data: result } = await exportDocumentDefinition.run(
      { documentId: "doc-1", format: "text" },
      { fetch: fakeFetch },
    );

    expect(new URL(calls[0]!.url).searchParams.get("mimeType")).toBe(
      "text/plain",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result).toEqual({
      documentId: "doc-1",
      format: "text",
      content: "Plain body text.",
    });
  });

  it("maps markdown to text/markdown", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return textResponse("# Heading\n\nBody");
    }) as typeof globalThis.fetch;

    const { data: result } = await exportDocumentDefinition.run(
      { documentId: "doc-1", format: "markdown" },
      { fetch: fakeFetch },
    );

    expect(new URL(calls[0]!.url).searchParams.get("mimeType")).toBe(
      "text/markdown",
    );
    expect(result.format).toBe("markdown");
    expect(result.content).toBe("# Heading\n\nBody");
  });

  it("throws a plain Error on 403 (export size limit exceeded)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 403,
            message: "This file is too large to be exported.",
            status: "PERMISSION_DENIED",
            errors: [{ message: "...", reason: "exportSizeLimitExceeded" }],
          },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await exportDocumentDefinition
      .run({ documentId: "huge", format: "markdown" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("too large to export");
  });
});
