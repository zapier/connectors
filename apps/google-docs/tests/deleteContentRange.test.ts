import { describe, expect, it } from "vitest";

import deleteContentRangeDefinition from "../scripts/deleteContentRange.ts";

const { inputSchema, outputSchema } = deleteContentRangeDefinition;

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

interface DeleteRangeRequest {
  deleteContentRange?: {
    range?: { startIndex?: number; endIndex?: number; tabId?: string };
  };
}

describe("deleteContentRange: inputSchema", () => {
  it("requires documentId, startIndex, and endIndex", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(
      inputSchema.safeParse({ documentId: "d", startIndex: 1 }).success,
    ).toBe(false);
    expect(
      inputSchema.safeParse({ documentId: "d", startIndex: 1, endIndex: 5 })
        .success,
    ).toBe(true);
  });
});

describe("deleteContentRange: governance", () => {
  it("is flagged destructive", () => {
    expect(deleteContentRangeDefinition.annotations?.destructiveHint).toBe(
      true,
    );
  });
});

describe("deleteContentRange: run", () => {
  it("posts a deleteContentRange with the range and returns {documentId, success}", async () => {
    const calls: Call[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ replies: [{}] });
    }) as typeof globalThis.fetch;

    const { data: result } = await deleteContentRangeDefinition.run(
      { documentId: "d1", startIndex: 3, endIndex: 8 },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain(":batchUpdate");
    const body = JSON.parse(String(calls[0]?.init?.body)) as {
      requests: DeleteRangeRequest[];
    };
    const range = body.requests[0]?.deleteContentRange?.range;
    expect(range?.startIndex).toBe(3);
    expect(range?.endIndex).toBe(8);
    expect(range?.tabId).toBeUndefined();
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result).toEqual({ documentId: "d1", success: true });
  });

  it("threads tabId into the range", async () => {
    const calls: Call[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ replies: [{}] });
    }) as typeof globalThis.fetch;

    await deleteContentRangeDefinition.run(
      { documentId: "d1", startIndex: 3, endIndex: 8, tabId: "t.4" },
      { fetch: fakeFetch },
    );

    const body = JSON.parse(String(calls[0]?.init?.body)) as {
      requests: DeleteRangeRequest[];
    };
    expect(body.requests[0]?.deleteContentRange?.range?.tabId).toBe("t.4");
  });

  it("throws a plain Error on a 400 (e.g. deleting the implicit final newline)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 400,
            message: "Invalid delete range.",
            status: "INVALID_ARGUMENT",
          },
        },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await deleteContentRangeDefinition
      .run(
        { documentId: "d1", startIndex: 3, endIndex: 8 },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("Invalid delete range");
  });
});
