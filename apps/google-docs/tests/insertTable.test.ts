import { describe, expect, it } from "vitest";

import insertTableDefinition from "../scripts/insertTable.ts";

const { inputSchema, outputSchema } = insertTableDefinition;

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

interface Call {
  url: string;
  init: RequestInit | undefined;
}

// A 2x2 table starting at index 5, cell first-paragraph indices at 7/9/12/14.
const WIRE_DOC_WITH_TABLE = {
  tabs: [
    {
      tabProperties: { tabId: "t.0", title: "Main", index: 0 },
      documentTab: {
        body: {
          content: [
            {
              startIndex: 5,
              endIndex: 16,
              table: {
                tableRows: [
                  {
                    tableCells: [
                      { content: [{ startIndex: 7, endIndex: 8 }] },
                      { content: [{ startIndex: 9, endIndex: 10 }] },
                    ],
                  },
                  {
                    tableCells: [
                      { content: [{ startIndex: 12, endIndex: 13 }] },
                      { content: [{ startIndex: 14, endIndex: 15 }] },
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

function calls(): {
  fetch: typeof globalThis.fetch;
  recorded: Call[];
} {
  const recorded: Call[] = [];
  const fetch = (async (url: string, init?: RequestInit) => {
    recorded.push({ url, init });
    if ((init?.method ?? "GET") === "GET")
      return jsonResponse(WIRE_DOC_WITH_TABLE);
    return jsonResponse({ replies: [{}] });
  }) as typeof globalThis.fetch;
  return { fetch, recorded };
}

function bodyOf(call: Call | undefined): {
  requests: Record<string, unknown>[];
} {
  return JSON.parse(String(call?.init?.body)) as {
    requests: Record<string, unknown>[];
  };
}

describe("insertTable: inputSchema", () => {
  it("requires documentId, rows, columns", () => {
    expect(inputSchema.safeParse({ documentId: "d" }).success).toBe(false);
    expect(
      inputSchema.safeParse({ documentId: "d", rows: 2, columns: 3 }).success,
    ).toBe(true);
    expect(
      inputSchema.safeParse({ documentId: "d", rows: 0, columns: 3 }).success,
    ).toBe(false);
  });
});

describe("insertTable: run", () => {
  it("empty insert: one InsertTable, then a read to report the table start index", async () => {
    const { fetch, recorded } = calls();
    const { data: result } = await insertTableDefinition.run(
      { documentId: "d1", rows: 2, columns: 2, index: 5 },
      { fetch },
    );

    // POST (insert) then GET (locate). No cell fill batch.
    const posts = recorded.filter((c) => (c.init?.method ?? "GET") === "POST");
    expect(posts).toHaveLength(1);
    const insertReq = bodyOf(posts[0]).requests[0] as {
      insertTable?: { rows?: number; columns?: number; location?: unknown };
    };
    expect(insertReq.insertTable?.rows).toBe(2);
    expect(insertReq.insertTable?.columns).toBe(2);
    expect(result.tableStartIndex).toBe(5);
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("seeded insert: fills cells descending by index in a second batch", async () => {
    const { fetch, recorded } = calls();
    await insertTableDefinition.run(
      {
        documentId: "d1",
        rows: 2,
        columns: 2,
        index: 5,
        cells: [
          ["A", "B"],
          ["C", "D"],
        ],
      },
      { fetch },
    );

    const posts = recorded.filter((c) => (c.init?.method ?? "GET") === "POST");
    // insert batch + fill batch.
    expect(posts).toHaveLength(2);
    const fill = bodyOf(posts[1]).requests as {
      insertText?: { text?: string; location?: { index?: number } };
    }[];
    // Four cells, ordered descending by index: 14, 12, 9, 7.
    expect(fill.map((r) => r.insertText?.location?.index)).toEqual([
      14, 12, 9, 7,
    ]);
    expect(fill.map((r) => r.insertText?.text)).toEqual(["D", "C", "B", "A"]);
  });

  it("rejects index < 1", async () => {
    const { fetch } = calls();
    const err = await insertTableDefinition
      .run({ documentId: "d1", rows: 1, columns: 1, index: 0 }, { fetch })
      .catch((e: unknown) => e);
    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("index must be >= 1");
  });
});
