import { describe, expect, it } from "vitest";

import removeListFormattingDefinition from "../scripts/removeListFormatting.ts";

const { inputSchema, outputSchema } = removeListFormattingDefinition;

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

interface DeleteBulletsRequest {
  deleteParagraphBullets?: {
    range?: { startIndex?: number; endIndex?: number; tabId?: string };
  };
}

function recordingFetch(calls: Call[]): typeof globalThis.fetch {
  return (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return jsonResponse({ replies: [{}] });
  }) as typeof globalThis.fetch;
}

function requestOf(call: Call | undefined): DeleteBulletsRequest | undefined {
  const body = JSON.parse(String(call?.init?.body)) as {
    requests: DeleteBulletsRequest[];
  };
  return body.requests[0];
}

describe("removeListFormatting: inputSchema", () => {
  it("requires documentId, startIndex, and endIndex", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(
      inputSchema.safeParse({ documentId: "d", startIndex: 1, endIndex: 5 })
        .success,
    ).toBe(true);
  });
});

describe("removeListFormatting: run", () => {
  it("emits one deleteParagraphBullets over the range", async () => {
    const calls: Call[] = [];
    const { data: result } = await removeListFormattingDefinition.run(
      { documentId: "d1", startIndex: 4, endIndex: 12, tabId: "t.1" },
      { fetch: recordingFetch(calls) },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain(":batchUpdate");
    expect(requestOf(calls[0])?.deleteParagraphBullets?.range).toEqual({
      startIndex: 4,
      endIndex: 12,
      tabId: "t.1",
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result).toEqual({ documentId: "d1", success: true });
  });
});
