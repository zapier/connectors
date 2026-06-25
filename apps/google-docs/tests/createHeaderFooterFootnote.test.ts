import { describe, expect, it } from "vitest";

import createFooterDefinition from "../scripts/createFooter.ts";
import createFootnoteDefinition from "../scripts/createFootnote.ts";
import createHeaderDefinition from "../scripts/createHeader.ts";

interface Call {
  url: string;
  init: RequestInit | undefined;
}

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

function fetchReturning(
  calls: Call[],
  reply: unknown,
): typeof globalThis.fetch {
  return (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return jsonResponse({ replies: [reply] });
  }) as typeof globalThis.fetch;
}

function requestOf(call: Call | undefined): Record<string, unknown> {
  return (
    JSON.parse(String(call?.init?.body)) as {
      requests: Record<string, unknown>[];
    }
  ).requests[0];
}

describe("createHeader", () => {
  it("creates a DEFAULT header and returns its segment id", async () => {
    const calls: Call[] = [];
    const { data } = await createHeaderDefinition.run(
      { documentId: "d1" },
      {
        fetch: fetchReturning(calls, { createHeader: { headerId: "kix.h1" } }),
      },
    );
    expect(requestOf(calls[0])).toEqual({ createHeader: { type: "DEFAULT" } });
    expect(data).toEqual({ documentId: "d1", segmentId: "kix.h1" });
  });
});

describe("createFooter", () => {
  it("creates a DEFAULT footer and returns its segment id", async () => {
    const calls: Call[] = [];
    const { data } = await createFooterDefinition.run(
      { documentId: "d1" },
      {
        fetch: fetchReturning(calls, { createFooter: { footerId: "kix.f1" } }),
      },
    );
    expect(requestOf(calls[0])).toEqual({ createFooter: { type: "DEFAULT" } });
    expect(data).toEqual({ documentId: "d1", segmentId: "kix.f1" });
  });
});

describe("createFootnote", () => {
  it("at an index: places the reference via location and returns the footnote segment id", async () => {
    const calls: Call[] = [];
    const { data } = await createFootnoteDefinition.run(
      { documentId: "d1", index: 12 },
      {
        fetch: fetchReturning(calls, {
          createFootnote: { footnoteId: "kix.fn1" },
        }),
      },
    );
    expect(requestOf(calls[0])).toEqual({
      createFootnote: { location: { index: 12 } },
    });
    expect(data).toEqual({ documentId: "d1", segmentId: "kix.fn1" });
  });

  it("without index: appends the reference at end of segment", async () => {
    const calls: Call[] = [];
    await createFootnoteDefinition.run(
      { documentId: "d1" },
      {
        fetch: fetchReturning(calls, {
          createFootnote: { footnoteId: "kix.fn2" },
        }),
      },
    );
    expect(requestOf(calls[0])).toEqual({
      createFootnote: { endOfSegmentLocation: { segmentId: "" } },
    });
  });

  it("rejects index < 1", async () => {
    const err = await createFootnoteDefinition
      .run(
        { documentId: "d1", index: 0 },
        { fetch: fetchReturning([], { createFootnote: {} }) },
      )
      .catch((e: unknown) => e);
    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("index must be >= 1");
  });
});
