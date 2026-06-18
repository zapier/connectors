import { describe, expect, it } from "vitest";

import appendTextDefinition from "../scripts/appendText.ts";

const { inputSchema, outputSchema } = appendTextDefinition;

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
  insertText?: {
    text?: string;
    location?: { index?: number };
    endOfSegmentLocation?: { segmentId?: string; tabId?: string };
  };
}

// A wire doc whose single body element ends at index 10.
const WIRE_DOCUMENT = {
  tabs: [
    {
      tabProperties: { tabId: "", title: "", index: 0 },
      documentTab: {
        body: {
          content: [
            {
              startIndex: 1,
              endIndex: 10,
              paragraph: {
                elements: [
                  { startIndex: 1, textRun: { content: "existing\n" } },
                ],
              },
            },
          ],
        },
      },
    },
  ],
};

describe("appendText: inputSchema", () => {
  it("requires documentId and text", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ documentId: "d" }).success).toBe(false);
    expect(inputSchema.safeParse({ documentId: "d", text: "x" }).success).toBe(
      true,
    );
  });

  it("defaults markdown to false", () => {
    const parsed = inputSchema.parse({ documentId: "d", text: "x" });
    expect(parsed.markdown).toBe(false);
  });
});

describe("appendText: governance", () => {
  it("is a write tool (not read-only)", () => {
    expect(appendTextDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("appendText: run", () => {
  it("plain: one batchUpdate with insertText using endOfSegmentLocation and no index", async () => {
    const calls: Call[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ replies: [{}] });
    }) as typeof globalThis.fetch;

    const { data: result } = await appendTextDefinition.run(
      { documentId: "d1", text: "more", markdown: false },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain(":batchUpdate");
    const body = JSON.parse(String(calls[0]?.init?.body)) as {
      requests: InsertTextRequest[];
    };
    const insert = body.requests[0]?.insertText;
    expect(insert?.text).toBe("more");
    expect(insert?.endOfSegmentLocation?.segmentId).toBe("");
    expect(insert?.location).toBeUndefined();
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.success).toBe(true);
  });

  it("plain with tabId: endOfSegmentLocation carries the tabId", async () => {
    const calls: Call[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ replies: [{}] });
    }) as typeof globalThis.fetch;

    await appendTextDefinition.run(
      { documentId: "d1", text: "more", markdown: false, tabId: "t.1" },
      { fetch: fakeFetch },
    );

    const body = JSON.parse(String(calls[0]?.init?.body)) as {
      requests: InsertTextRequest[];
    };
    expect(body.requests[0]?.insertText?.endOfSegmentLocation?.tabId).toBe(
      "t.1",
    );
  });

  it("markdown: reads the segment end (GET) then inserts at a numeric anchor", async () => {
    const calls: Call[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      if ((init?.method ?? "GET") === "GET") return jsonResponse(WIRE_DOCUMENT);
      return jsonResponse({ replies: [{}] });
    }) as typeof globalThis.fetch;

    await appendTextDefinition.run(
      { documentId: "d1", text: "# H", markdown: true },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(2);
    expect(calls[0]?.init?.method).toBe("GET");
    expect(calls[1]?.url).toContain(":batchUpdate");
    const body = JSON.parse(String(calls[1]?.init?.body)) as {
      requests: InsertTextRequest[];
    };
    const insert = body.requests[0]?.insertText;
    expect(typeof insert?.location?.index).toBe("number");
    // anchor = end - 1 = 10 - 1 = 9
    expect(insert?.location?.index).toBe(9);
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

    const err = await appendTextDefinition
      .run(
        { documentId: "d1", text: "more", markdown: false },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("view-only");
  });
});
