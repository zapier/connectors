import { describe, expect, it } from "vitest";

import getDocumentDefinition from "../scripts/getDocument.ts";

const { inputSchema, outputSchema } = getDocumentDefinition;

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

// A wire Document with one tab carrying a heading paragraph, a body paragraph,
// and a 1x1 table whose cell holds a paragraph — exercises the table-cell walk.
const WIRE_DOCUMENT = {
  documentId: "doc-1",
  title: "My Doc",
  revisionId: "rev-99",
  inlineObjects: {
    "kix.img1": {
      inlineObjectProperties: { embeddedObject: { title: "logo" } },
    },
  },
  tabs: [
    {
      tabProperties: { tabId: "t.0", title: "Main", index: 0 },
      documentTab: {
        body: {
          content: [
            {
              startIndex: 1,
              endIndex: 14,
              paragraph: {
                elements: [
                  {
                    startIndex: 1,
                    endIndex: 14,
                    textRun: { content: "Introduction\n" },
                  },
                ],
              },
            },
            {
              startIndex: 14,
              endIndex: 27,
              paragraph: {
                elements: [
                  {
                    startIndex: 14,
                    endIndex: 27,
                    textRun: { content: "Body text.\n\n" },
                  },
                ],
              },
            },
            {
              startIndex: 27,
              endIndex: 40,
              table: {
                tableRows: [
                  {
                    tableCells: [
                      {
                        content: [
                          {
                            startIndex: 29,
                            endIndex: 40,
                            paragraph: {
                              elements: [
                                {
                                  startIndex: 29,
                                  endIndex: 40,
                                  textRun: { content: "Cell text\n" },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    ],
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

describe("getDocument: inputSchema", () => {
  it("requires documentId", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ documentId: "doc-1" }).success).toBe(true);
  });
});

describe("getDocument: governance", () => {
  it("is read-only", () => {
    expect(getDocumentDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("getDocument: run", () => {
  it("GETs the masked document and reshapes the wire tree", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(WIRE_DOCUMENT);
    }) as typeof globalThis.fetch;

    const { data: result } = await getDocumentDefinition.run(
      { documentId: "doc-1" },
      { fetch: fakeFetch },
    );

    // Reads complete with the fixed field mask.
    expect(calls[0]?.url).toContain("includeTabsContent=true");
    expect(calls[0]?.url).toContain("fields=");
    expect(calls[0]?.init?.method).toBe("GET");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.documentId).toBe("doc-1");
    expect(result.title).toBe("My Doc");
    expect(result.revisionId).toBe("rev-99");

    // Flattened text includes the table cell text.
    expect(result.text).toBe("Introduction\nBody text.\n\nCell text\n");
    expect(result.text).toContain("Cell text");

    // Top-level content elements carry positions, tabId, and type.
    expect(result.content).toHaveLength(3);
    expect(result.content[0]).toMatchObject({
      startIndex: 1,
      endIndex: 14,
      tabId: "t.0",
      type: "paragraph",
      text: "Introduction\n",
    });
    expect(result.content[2]).toMatchObject({
      tabId: "t.0",
      type: "table",
      text: "",
    });

    // Tabs summarized.
    expect(result.tabs).toEqual([{ tabId: "t.0", title: "Main", index: 0 }]);

    // inlineObjects passed through; small doc not truncated.
    expect(result.inlineObjects).toHaveProperty("kix.img1");
    expect(result.truncated).toBe(false);
  });

  it("filters content[] to elements overlapping the startIndex/endIndex range", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(WIRE_DOCUMENT)) as typeof globalThis.fetch;

    const { data: result } = await getDocumentDefinition.run(
      { documentId: "doc-1", startIndex: 14, endIndex: 27 },
      { fetch: fakeFetch },
    );

    // Only the body paragraph (14-27) overlaps the range; the heading (1-14,
    // exclusive end) and the table (27-40) fall outside.
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toMatchObject({ startIndex: 14, endIndex: 27 });
  });

  it("throws a plain Error on 404 (document not found)", async () => {
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

    const err = await getDocumentDefinition
      .run({ documentId: "missing" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("404");
    expect((err as Error).message).toContain("not found");
  });
});
