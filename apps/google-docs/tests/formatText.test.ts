import { describe, expect, it } from "vitest";

import formatTextDefinition from "../scripts/formatText.ts";

const { inputSchema, outputSchema } = formatTextDefinition;

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

interface UpdateTextStyleRequest {
  updateTextStyle?: {
    range?: { startIndex?: number; endIndex?: number; tabId?: string };
    textStyle?: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      strikethrough?: boolean;
      fontSize?: { magnitude?: number; unit?: string };
      weightedFontFamily?: { fontFamily?: string };
      foregroundColor?: unknown;
      backgroundColor?: unknown;
      link?: { url?: string };
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

function requestOf(call: Call | undefined): UpdateTextStyleRequest | undefined {
  const body = JSON.parse(String(call?.init?.body)) as {
    requests: UpdateTextStyleRequest[];
  };
  return body.requests[0];
}

describe("formatText: inputSchema", () => {
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

describe("formatText: governance", () => {
  it("is a write tool (not read-only)", () => {
    expect(formatTextDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("formatText: run", () => {
  it("bold+italic: one updateTextStyle request with the range and a fields mask naming both", async () => {
    const calls: Call[] = [];
    const fakeFetch = recordingFetch(calls);

    const { data: result } = await formatTextDefinition.run(
      {
        documentId: "d1",
        startIndex: 3,
        endIndex: 8,
        bold: true,
        italic: true,
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain(":batchUpdate");
    const req = requestOf(calls[0]);
    expect(req?.updateTextStyle?.textStyle?.bold).toBe(true);
    expect(req?.updateTextStyle?.textStyle?.italic).toBe(true);
    expect(req?.updateTextStyle?.fields).toContain("bold");
    expect(req?.updateTextStyle?.fields).toContain("italic");
    expect(req?.updateTextStyle?.range).toEqual({ startIndex: 3, endIndex: 8 });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result).toEqual({ documentId: "d1", success: true });
  });

  it("foregroundColor: converts #FF0000 to 0-1 floats and names foregroundColor in fields", async () => {
    const calls: Call[] = [];
    const fakeFetch = recordingFetch(calls);

    await formatTextDefinition.run(
      {
        documentId: "d1",
        startIndex: 1,
        endIndex: 2,
        foregroundColor: "#FF0000",
      },
      { fetch: fakeFetch },
    );

    const req = requestOf(calls[0]);
    expect(req?.updateTextStyle?.textStyle?.foregroundColor).toEqual({
      color: { rgbColor: { red: 1, green: 0, blue: 0 } },
    });
    expect(req?.updateTextStyle?.fields).toContain("foregroundColor");
  });

  it("fontSize/fontFamily/link map to their API shapes", async () => {
    const calls: Call[] = [];
    const fakeFetch = recordingFetch(calls);

    await formatTextDefinition.run(
      {
        documentId: "d1",
        startIndex: 1,
        endIndex: 2,
        fontSize: 14,
        fontFamily: "Arial",
        link: "https://example.com",
      },
      { fetch: fakeFetch },
    );

    const style = requestOf(calls[0])?.updateTextStyle?.textStyle;
    expect(style?.fontSize).toEqual({ magnitude: 14, unit: "PT" });
    expect(style?.weightedFontFamily?.fontFamily).toBe("Arial");
    expect(style?.link?.url).toBe("https://example.com");
  });

  it("threads tabId into the range", async () => {
    const calls: Call[] = [];
    const fakeFetch = recordingFetch(calls);

    await formatTextDefinition.run(
      {
        documentId: "d1",
        startIndex: 1,
        endIndex: 2,
        bold: true,
        tabId: "t.7",
      },
      { fetch: fakeFetch },
    );

    expect(requestOf(calls[0])?.updateTextStyle?.range?.tabId).toBe("t.7");
  });

  it("throws without fetching when no style fields are provided", async () => {
    const calls: Call[] = [];
    const fakeFetch = recordingFetch(calls);

    const err = await formatTextDefinition
      .run(
        { documentId: "d1", startIndex: 1, endIndex: 2 },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("at least one style");
    expect(calls).toHaveLength(0);
  });

  it("throws without fetching on an unparseable hex color", async () => {
    const calls: Call[] = [];
    const fakeFetch = recordingFetch(calls);

    const err = await formatTextDefinition
      .run(
        {
          documentId: "d1",
          startIndex: 1,
          endIndex: 2,
          foregroundColor: "red",
        },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("Invalid foregroundColor");
    expect(calls).toHaveLength(0);
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

    const err = await formatTextDefinition
      .run(
        { documentId: "d1", startIndex: 1, endIndex: 2, bold: true },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("view-only");
  });
});
