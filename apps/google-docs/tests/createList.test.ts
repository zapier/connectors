import { describe, expect, it } from "vitest";

import createListDefinition from "../scripts/createList.ts";

const { inputSchema, outputSchema } = createListDefinition;

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

interface BulletRequest {
  insertText?: {
    text?: string;
    location?: { index?: number; tabId?: string };
  };
  createParagraphBullets?: {
    range?: { startIndex?: number; endIndex?: number; tabId?: string };
    bulletPreset?: string;
  };
}

// Records calls; returns a wire doc on GET (for the nesting path's read) and a
// batchUpdate replies envelope on POST.
function fetchWith(calls: Call[], doc: unknown): typeof globalThis.fetch {
  return (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if ((init?.method ?? "GET") === "GET") return jsonResponse(doc);
    return jsonResponse({ replies: [{}, {}] });
  }) as typeof globalThis.fetch;
}

function postCall(calls: Call[]): Call | undefined {
  return calls.find((c) => (c.init?.method ?? "GET") === "POST");
}

function requestsOf(call: Call | undefined): BulletRequest[] {
  const body = JSON.parse(String(call?.init?.body)) as {
    requests: BulletRequest[];
  };
  return body.requests;
}

describe("createList: inputSchema", () => {
  it("requires documentId, startIndex, and endIndex; style defaults to bullet", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    const parsed = inputSchema.safeParse({
      documentId: "d",
      startIndex: 1,
      endIndex: 5,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.style).toBe("bullet");
  });
});

describe("createList: governance", () => {
  it("is a write tool (not read-only)", () => {
    expect(createListDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("createList: run (flat)", () => {
  it("bullet: one createParagraphBullets over the range, no delete (Create changes style on an existing list)", async () => {
    const calls: Call[] = [];
    const { data: result } = await createListDefinition.run(
      { documentId: "d1", startIndex: 3, endIndex: 20, style: "bullet" },
      { fetch: fetchWith(calls, {}) },
    );

    // Flat path makes no read — just the one batchUpdate.
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain(":batchUpdate");
    const reqs = requestsOf(calls[0]);
    expect(reqs).toHaveLength(1);
    expect(reqs[0]?.createParagraphBullets?.bulletPreset).toBe(
      "BULLET_DISC_CIRCLE_SQUARE",
    );
    expect(reqs[0]?.createParagraphBullets?.range).toEqual({
      startIndex: 3,
      endIndex: 20,
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result).toEqual({ documentId: "d1", success: true });
  });

  it("numbered: uses the numbered preset", async () => {
    const calls: Call[] = [];
    await createListDefinition.run(
      { documentId: "d1", startIndex: 1, endIndex: 9, style: "numbered" },
      { fetch: fetchWith(calls, {}) },
    );
    expect(requestsOf(calls[0])[0]?.createParagraphBullets?.bulletPreset).toBe(
      "NUMBERED_DECIMAL_ALPHA_ROMAN",
    );
  });

  it("threads tabId into the range", async () => {
    const calls: Call[] = [];
    await createListDefinition.run(
      {
        documentId: "d1",
        startIndex: 1,
        endIndex: 9,
        style: "bullet",
        tabId: "t.2",
      },
      { fetch: fetchWith(calls, {}) },
    );
    expect(requestsOf(calls[0])[0]?.createParagraphBullets?.range?.tabId).toBe(
      "t.2",
    );
  });
});

describe("createList: run (nested levels)", () => {
  // Two body paragraphs: [1,6) and [6,11).
  const WIRE_DOC = {
    tabs: [
      {
        tabProperties: { tabId: "t.0", title: "Main", index: 0 },
        documentTab: {
          body: {
            content: [
              {
                startIndex: 1,
                endIndex: 6,
                paragraph: { elements: [{ textRun: { content: "abcd\n" } }] },
              },
              {
                startIndex: 6,
                endIndex: 11,
                paragraph: { elements: [{ textRun: { content: "efgh\n" } }] },
              },
            ],
          },
        },
      },
    ],
  };

  it("levels [0,1]: reads the doc, inserts a leading tab for the nested paragraph (descending), then bullets the tab-expanded range", async () => {
    const calls: Call[] = [];
    await createListDefinition.run(
      {
        documentId: "d1",
        startIndex: 1,
        endIndex: 11,
        style: "bullet",
        levels: [0, 1],
      },
      { fetch: fetchWith(calls, WIRE_DOC) },
    );

    // One GET (to find paragraph indices) + one POST batch.
    expect(calls[0]?.init?.method ?? "GET").toBe("GET");
    const reqs = requestsOf(postCall(calls));
    // The level-1 paragraph (start 6) gets one tab; the level-0 one gets none.
    const tabInsert = reqs.find((r) => r.insertText);
    expect(tabInsert?.insertText?.text).toBe("\t");
    expect(tabInsert?.insertText?.location?.index).toBe(6);
    // Bullets over the range expanded by the one inserted tab (11 -> 12).
    const bullets = reqs.find((r) => r.createParagraphBullets);
    expect(bullets?.createParagraphBullets?.range).toEqual({
      startIndex: 1,
      endIndex: 12,
    });
  });

  it("rejects a levels/paragraph count mismatch", async () => {
    const calls: Call[] = [];
    const err = await createListDefinition
      .run(
        {
          documentId: "d1",
          startIndex: 1,
          endIndex: 11,
          style: "bullet",
          levels: [0, 1, 2],
        },
        { fetch: fetchWith(calls, WIRE_DOC) },
      )
      .catch((e: unknown) => e);
    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("levels has 3 entries");
  });
});
