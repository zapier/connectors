import { describe, expect, it } from "vitest";

import replaceImageDefinition from "../scripts/replaceImage.ts";

const { inputSchema, outputSchema } = replaceImageDefinition;

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

interface ReplaceImageRequest {
  replaceImage?: {
    imageObjectId?: string;
    uri?: string;
    tabId?: string;
  };
}

const IMG = "https://cdn.example.com/new.png";

function recordingFetch(calls: Call[]): typeof globalThis.fetch {
  return (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return jsonResponse({ replies: [{}] });
  }) as typeof globalThis.fetch;
}

function requestOf(call: Call | undefined): ReplaceImageRequest | undefined {
  const body = JSON.parse(String(call?.init?.body)) as {
    requests: ReplaceImageRequest[];
  };
  return body.requests[0];
}

describe("replaceImage: inputSchema", () => {
  it("requires documentId, imageObjectId, and imageUrl", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(
      inputSchema.safeParse({ documentId: "d", imageObjectId: "kix.1" })
        .success,
    ).toBe(false);
    expect(
      inputSchema.safeParse({
        documentId: "d",
        imageObjectId: "kix.1",
        imageUrl: IMG,
      }).success,
    ).toBe(true);
  });
});

describe("replaceImage: governance", () => {
  it("is a write tool (not read-only) and idempotent", () => {
    expect(replaceImageDefinition.annotations?.readOnlyHint).toBe(false);
    expect(replaceImageDefinition.annotations?.idempotentHint).toBe(true);
  });
});

describe("replaceImage: run", () => {
  it("posts a replaceImage with the imageObjectId + uri and returns {documentId, success}", async () => {
    const calls: Call[] = [];
    const fakeFetch = recordingFetch(calls);

    const { data: result } = await replaceImageDefinition.run(
      { documentId: "d1", imageObjectId: "kix.1", imageUrl: IMG },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain(":batchUpdate");
    const req = requestOf(calls[0]);
    expect(req?.replaceImage?.imageObjectId).toBe("kix.1");
    expect(req?.replaceImage?.uri).toBe(IMG);
    expect(req?.replaceImage?.tabId).toBeUndefined();
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result).toEqual({ documentId: "d1", success: true });
  });

  it("threads tabId into the replaceImage request", async () => {
    const calls: Call[] = [];
    const fakeFetch = recordingFetch(calls);

    await replaceImageDefinition.run(
      { documentId: "d1", imageObjectId: "kix.1", imageUrl: IMG, tabId: "t.2" },
      { fetch: fakeFetch },
    );

    expect(requestOf(calls[0])?.replaceImage?.tabId).toBe("t.2");
  });

  it("throws without fetching on a non-http(s) image URL", async () => {
    const calls: Call[] = [];
    const fakeFetch = recordingFetch(calls);

    const err = await replaceImageDefinition
      .run(
        {
          documentId: "d1",
          imageObjectId: "kix.1",
          imageUrl: "ftp://x/new.png",
        },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("public http(s) URL");
    expect(calls).toHaveLength(0);
  });

  it("throws a plain Error mapping Google's image-retrieval failure", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 400,
            message: "There was a problem retrieving the image.",
            status: "INVALID_ARGUMENT",
          },
        },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await replaceImageDefinition
      .run(
        { documentId: "d1", imageObjectId: "kix.1", imageUrl: IMG },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("PNG/JPEG/GIF");
  });
});
