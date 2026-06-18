import { describe, expect, it } from "vitest";

import insertImageDefinition from "../scripts/insertImage.ts";

const { inputSchema, outputSchema } = insertImageDefinition;

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

interface InsertInlineImageRequest {
  insertInlineImage?: {
    uri?: string;
    location?: { index?: number; tabId?: string };
    endOfSegmentLocation?: { segmentId?: string; tabId?: string };
    objectSize?: {
      width?: { magnitude?: number; unit?: string };
      height?: { magnitude?: number; unit?: string };
    };
  };
}

const IMG = "https://cdn.example.com/cat.png";

function recordingFetch(
  calls: Call[],
  reply: unknown = { replies: [{ insertInlineImage: { objectId: "img1" } }] },
): typeof globalThis.fetch {
  return (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return jsonResponse(reply);
  }) as typeof globalThis.fetch;
}

function requestOf(
  call: Call | undefined,
): InsertInlineImageRequest | undefined {
  const body = JSON.parse(String(call?.init?.body)) as {
    requests: InsertInlineImageRequest[];
  };
  return body.requests[0];
}

describe("insertImage: inputSchema", () => {
  it("requires documentId and imageUrl", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ documentId: "d" }).success).toBe(false);
    expect(
      inputSchema.safeParse({ documentId: "d", imageUrl: IMG }).success,
    ).toBe(true);
  });
});

describe("insertImage: governance", () => {
  it("is a write tool (not read-only) and non-idempotent", () => {
    expect(insertImageDefinition.annotations?.readOnlyHint).toBe(false);
    expect(insertImageDefinition.annotations?.idempotentHint).toBe(false);
  });
});

describe("insertImage: run", () => {
  it("with index: inserts at location.index with the uri and returns the new objectId", async () => {
    const calls: Call[] = [];
    const fakeFetch = recordingFetch(calls);

    const { data: result } = await insertImageDefinition.run(
      { documentId: "d1", imageUrl: IMG, index: 5 },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain(":batchUpdate");
    const req = requestOf(calls[0]);
    expect(req?.insertInlineImage?.location?.index).toBe(5);
    expect(req?.insertInlineImage?.uri).toBe(IMG);
    expect(req?.insertInlineImage?.endOfSegmentLocation).toBeUndefined();
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.objectId).toBe("img1");
  });

  it("without index: appends via endOfSegmentLocation and omits location", async () => {
    const calls: Call[] = [];
    const fakeFetch = recordingFetch(calls);

    await insertImageDefinition.run(
      { documentId: "d1", imageUrl: IMG },
      { fetch: fakeFetch },
    );

    const req = requestOf(calls[0]);
    expect(req?.insertInlineImage?.endOfSegmentLocation?.segmentId).toBe("");
    expect(req?.insertInlineImage?.location).toBeUndefined();
  });

  it("width/height map to objectSize PT magnitudes", async () => {
    const calls: Call[] = [];
    const fakeFetch = recordingFetch(calls);

    await insertImageDefinition.run(
      { documentId: "d1", imageUrl: IMG, width: 100, height: 200 },
      { fetch: fakeFetch },
    );

    const size = requestOf(calls[0])?.insertInlineImage?.objectSize;
    expect(size?.width).toEqual({ magnitude: 100, unit: "PT" });
    expect(size?.height).toEqual({ magnitude: 200, unit: "PT" });
  });

  it("returns an empty objectId when the reply omits one", async () => {
    const calls: Call[] = [];
    const fakeFetch = recordingFetch(calls, { replies: [{}] });

    const { data: result } = await insertImageDefinition.run(
      { documentId: "d1", imageUrl: IMG },
      { fetch: fakeFetch },
    );

    expect(result.objectId).toBe("");
  });

  it("throws without fetching on a non-http(s) URL", async () => {
    const calls: Call[] = [];
    const fakeFetch = recordingFetch(calls);

    const err = await insertImageDefinition
      .run(
        { documentId: "d1", imageUrl: "ftp://x/cat.png" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("public http(s) URL");
    expect(calls).toHaveLength(0);
  });

  it("throws without fetching on a URL over the 2kB limit", async () => {
    const calls: Call[] = [];
    const fakeFetch = recordingFetch(calls);
    const longUrl = `https://cdn.example.com/${"a".repeat(2100)}.png`;

    const err = await insertImageDefinition
      .run({ documentId: "d1", imageUrl: longUrl }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("2kB");
    expect(calls).toHaveLength(0);
  });

  it("throws without fetching when index < 1", async () => {
    const calls: Call[] = [];
    const fakeFetch = recordingFetch(calls);

    const err = await insertImageDefinition
      .run({ documentId: "d1", imageUrl: IMG, index: 0 }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("index must be >= 1");
    expect(calls).toHaveLength(0);
  });

  it("throws a plain Error mapping Google's image-forbidden failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 400,
            message: "Access to the provided image was forbidden.",
            status: "INVALID_ARGUMENT",
          },
        },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await insertImageDefinition
      .run({ documentId: "d1", imageUrl: IMG }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("not publicly fetchable");
  });
});
