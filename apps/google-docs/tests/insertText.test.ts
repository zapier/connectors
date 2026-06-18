import { describe, expect, it } from "vitest";

import insertTextDefinition from "../scripts/insertText.ts";

const { inputSchema, outputSchema } = insertTextDefinition;

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
  insertText?: { text?: string; location?: { index?: number; tabId?: string } };
}

describe("insertText: inputSchema", () => {
  it("requires documentId, text, and index", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ documentId: "d", text: "x" }).success).toBe(
      false,
    );
    expect(
      inputSchema.safeParse({ documentId: "d", text: "x", index: 1 }).success,
    ).toBe(true);
  });
});

describe("insertText: governance", () => {
  it("is a write tool (not read-only)", () => {
    expect(insertTextDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("insertText: run", () => {
  it("one batchUpdate with insertText.location.index equal to input.index", async () => {
    const calls: Call[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ replies: [{}] });
    }) as typeof globalThis.fetch;

    const { data: result } = await insertTextDefinition.run(
      { documentId: "d1", text: "hi", index: 5 },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain(":batchUpdate");
    const body = JSON.parse(String(calls[0]?.init?.body)) as {
      requests: InsertTextRequest[];
    };
    const insert = body.requests[0]?.insertText;
    expect(insert?.text).toBe("hi");
    expect(insert?.location?.index).toBe(5);
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.success).toBe(true);
  });

  it("threads tabId into location.tabId", async () => {
    const calls: Call[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ replies: [{}] });
    }) as typeof globalThis.fetch;

    await insertTextDefinition.run(
      { documentId: "d1", text: "hi", index: 5, tabId: "t.2" },
      { fetch: fakeFetch },
    );

    const body = JSON.parse(String(calls[0]?.init?.body)) as {
      requests: InsertTextRequest[];
    };
    expect(body.requests[0]?.insertText?.location?.tabId).toBe("t.2");
  });

  it("throws when index < 1 without calling fetch", async () => {
    let called = false;
    const fakeFetch: typeof globalThis.fetch = (async () => {
      called = true;
      return jsonResponse({ replies: [{}] });
    }) as typeof globalThis.fetch;

    const err = await insertTextDefinition
      .run({ documentId: "d1", text: "hi", index: 0 }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("index must be >= 1");
    expect(called).toBe(false);
  });

  it("throws a plain Error on a 404", async () => {
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

    const err = await insertTextDefinition
      .run(
        { documentId: "missing", text: "hi", index: 5 },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("404");
  });
});
