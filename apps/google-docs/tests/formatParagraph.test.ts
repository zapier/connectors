import { describe, expect, it } from "vitest";

import formatParagraphDefinition from "../scripts/formatParagraph.ts";

const { inputSchema, outputSchema } = formatParagraphDefinition;

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

interface UpdateParagraphStyleRequest {
  updateParagraphStyle?: {
    range?: { startIndex?: number; endIndex?: number; tabId?: string };
    paragraphStyle?: {
      namedStyleType?: string;
      alignment?: string;
      lineSpacing?: number;
      spaceAbove?: { magnitude?: number; unit?: string };
      indentStart?: { magnitude?: number; unit?: string };
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
): UpdateParagraphStyleRequest | undefined {
  const body = JSON.parse(String(call?.init?.body)) as {
    requests: UpdateParagraphStyleRequest[];
  };
  return body.requests[0];
}

describe("formatParagraph: inputSchema", () => {
  it("requires documentId, startIndex, and endIndex", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(
      inputSchema.safeParse({ documentId: "d", startIndex: 1, endIndex: 5 })
        .success,
    ).toBe(true);
  });
});

describe("formatParagraph: governance", () => {
  it("is a write tool (not read-only)", () => {
    expect(formatParagraphDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("formatParagraph: run", () => {
  it("namedStyle heading2 → HEADING_2 with namedStyleType in the fields mask", async () => {
    const calls: Call[] = [];
    const { data: result } = await formatParagraphDefinition.run(
      { documentId: "d1", startIndex: 1, endIndex: 9, namedStyle: "heading2" },
      { fetch: recordingFetch(calls) },
    );

    expect(calls).toHaveLength(1);
    const req = requestOf(calls[0]);
    expect(req?.updateParagraphStyle?.paragraphStyle?.namedStyleType).toBe(
      "HEADING_2",
    );
    expect(req?.updateParagraphStyle?.fields).toContain("namedStyleType");
    expect(req?.updateParagraphStyle?.range).toEqual({
      startIndex: 1,
      endIndex: 9,
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("alignment + lineSpacing + spacing/indent map to API shapes and fields", async () => {
    const calls: Call[] = [];
    await formatParagraphDefinition.run(
      {
        documentId: "d1",
        startIndex: 1,
        endIndex: 9,
        alignment: "center",
        lineSpacing: 150,
        spaceAbove: 12,
        indentStart: 36,
      },
      { fetch: recordingFetch(calls) },
    );

    const ps = requestOf(calls[0])?.updateParagraphStyle;
    expect(ps?.paragraphStyle?.alignment).toBe("CENTER");
    expect(ps?.paragraphStyle?.lineSpacing).toBe(150);
    expect(ps?.paragraphStyle?.spaceAbove).toEqual({
      magnitude: 12,
      unit: "PT",
    });
    expect(ps?.paragraphStyle?.indentStart).toEqual({
      magnitude: 36,
      unit: "PT",
    });
    for (const f of ["alignment", "lineSpacing", "spaceAbove", "indentStart"]) {
      expect(ps?.fields).toContain(f);
    }
  });

  it("threads tabId into the range", async () => {
    const calls: Call[] = [];
    await formatParagraphDefinition.run(
      {
        documentId: "d1",
        startIndex: 1,
        endIndex: 9,
        alignment: "right",
        tabId: "t.3",
      },
      { fetch: recordingFetch(calls) },
    );
    expect(requestOf(calls[0])?.updateParagraphStyle?.range?.tabId).toBe("t.3");
  });

  it("throws without fetching when no style is provided", async () => {
    const calls: Call[] = [];
    const err = await formatParagraphDefinition
      .run(
        { documentId: "d1", startIndex: 1, endIndex: 9 },
        { fetch: recordingFetch(calls) },
      )
      .catch((e: unknown) => e);

    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("at least one style");
    expect(calls).toHaveLength(0);
  });
});
