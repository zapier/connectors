import { describe, expect, it } from "vitest";

import findTextDefinition from "../scripts/findText.ts";

const { inputSchema, outputSchema } = findTextDefinition;

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

// "Hello world" lives at indices 1-12 in tab t.0; the word "world" starts at
// index 7 (1 + offset 6) and ends (exclusive) at index 12.
const WIRE_DOCUMENT = {
  documentId: "doc-1",
  title: "Doc",
  tabs: [
    {
      tabProperties: { tabId: "t.0", title: "Main", index: 0 },
      documentTab: {
        body: {
          content: [
            {
              startIndex: 1,
              endIndex: 13,
              paragraph: {
                elements: [
                  {
                    startIndex: 1,
                    endIndex: 13,
                    textRun: { content: "Hello world\n" },
                  },
                ],
              },
            },
          ],
        },
      },
    },
  ],
};

describe("findText: inputSchema", () => {
  it("requires documentId and query", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ documentId: "d" }).success).toBe(false);
    expect(inputSchema.safeParse({ documentId: "d", query: "x" }).success).toBe(
      true,
    );
  });

  it("defaults matchCase to false", () => {
    const parsed = inputSchema.parse({ documentId: "d", query: "x" });
    expect(parsed.matchCase).toBe(false);
  });
});

describe("findText: governance", () => {
  it("is read-only", () => {
    expect(findTextDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("findText: run", () => {
  it("returns each match's {text, startIndex, endIndex, tabId}", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(WIRE_DOCUMENT);
    }) as typeof globalThis.fetch;

    const { data: result } = await findTextDefinition.run(
      { documentId: "doc-1", query: "world", matchCase: false },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain("includeTabsContent=true");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);

    expect(result.documentId).toBe("doc-1");
    expect(result.matches).toEqual([
      { text: "world", startIndex: 7, endIndex: 12, tabId: "t.0" },
    ]);
  });

  it("returns an empty matches array when not found (not an error)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(WIRE_DOCUMENT)) as typeof globalThis.fetch;

    const { data: result } = await findTextDefinition.run(
      { documentId: "doc-1", query: "absent", matchCase: false },
      { fetch: fakeFetch },
    );

    expect(result.matches).toEqual([]);
  });

  it("honors matchCase: a case mismatch yields no matches", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(WIRE_DOCUMENT)) as typeof globalThis.fetch;

    const sensitive = await findTextDefinition.run(
      { documentId: "doc-1", query: "WORLD", matchCase: true },
      { fetch: fakeFetch },
    );
    expect(sensitive.data.matches).toEqual([]);

    const insensitive = await findTextDefinition.run(
      { documentId: "doc-1", query: "WORLD", matchCase: false },
      { fetch: fakeFetch },
    );
    expect(insensitive.data.matches).toHaveLength(1);
    expect(insensitive.data.matches[0]?.text).toBe("world");
  });

  it("throws a plain Error on 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 404,
            message: "Requested entity was not found.",
            status: "NOT_FOUND",
          },
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await findTextDefinition
      .run(
        { documentId: "missing", query: "x", matchCase: false },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("404");
  });
});
