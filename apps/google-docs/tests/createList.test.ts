import { describe, expect, it } from "vitest";

import createListDefinition from "../scripts/createList.ts";

const { inputSchema, outputSchema } = createListDefinition;

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

interface BulletRequest {
  deleteParagraphBullets?: {
    range?: { startIndex?: number; endIndex?: number; tabId?: string };
  };
  createParagraphBullets?: {
    range?: { startIndex?: number; endIndex?: number; tabId?: string };
    bulletPreset?: string;
  };
}

function recordingFetch(calls: Call[]): typeof globalThis.fetch {
  return (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return jsonResponse({ replies: [{}, {}] });
  }) as typeof globalThis.fetch;
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

describe("createList: run", () => {
  it("bullet: deletes then creates bullets over the range in one batch", async () => {
    const calls: Call[] = [];
    const { data: result } = await createListDefinition.run(
      { documentId: "d1", startIndex: 3, endIndex: 20, style: "bullet" },
      { fetch: recordingFetch(calls) },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain(":batchUpdate");
    const reqs = requestsOf(calls[0]);
    // Delete first (no-op on plain paragraphs; converts an existing list), then create.
    expect(reqs[0]?.deleteParagraphBullets?.range).toEqual({
      startIndex: 3,
      endIndex: 20,
    });
    expect(reqs[1]?.createParagraphBullets?.bulletPreset).toBe(
      "BULLET_DISC_CIRCLE_SQUARE",
    );
    expect(reqs[1]?.createParagraphBullets?.range).toEqual({
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
      { fetch: recordingFetch(calls) },
    );
    expect(requestsOf(calls[0])[1]?.createParagraphBullets?.bulletPreset).toBe(
      "NUMBERED_DECIMAL_ALPHA_ROMAN",
    );
  });

  it("threads tabId into both requests' ranges", async () => {
    const calls: Call[] = [];
    await createListDefinition.run(
      {
        documentId: "d1",
        startIndex: 1,
        endIndex: 9,
        style: "bullet",
        tabId: "t.2",
      },
      { fetch: recordingFetch(calls) },
    );
    const reqs = requestsOf(calls[0]);
    expect(reqs[0]?.deleteParagraphBullets?.range?.tabId).toBe("t.2");
    expect(reqs[1]?.createParagraphBullets?.range?.tabId).toBe("t.2");
  });
});
