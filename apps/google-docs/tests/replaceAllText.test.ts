import { describe, expect, it } from "vitest";

import replaceAllTextDefinition from "../scripts/replaceAllText.ts";

const { inputSchema, outputSchema } = replaceAllTextDefinition;

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

interface ReplaceAllRequest {
  replaceAllText?: {
    containsText?: { text?: string; matchCase?: boolean };
    replaceText?: string;
    tabsCriteria?: { tabIds?: string[] };
  };
}

describe("replaceAllText: inputSchema", () => {
  it("requires documentId, find, and replace", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ documentId: "d", find: "a" }).success).toBe(
      false,
    );
    expect(
      inputSchema.safeParse({ documentId: "d", find: "a", replace: "b" })
        .success,
    ).toBe(true);
  });

  it("defaults matchCase to false", () => {
    const parsed = inputSchema.parse({
      documentId: "d",
      find: "a",
      replace: "b",
    });
    expect(parsed.matchCase).toBe(false);
  });
});

describe("replaceAllText: governance", () => {
  it("is a write tool (not read-only)", () => {
    expect(replaceAllTextDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("replaceAllText: run", () => {
  it("returns occurrencesChanged from the reply; matchCase defaults to false in the request", async () => {
    const calls: Call[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        replies: [{ replaceAllText: { occurrencesChanged: 3 } }],
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await replaceAllTextDefinition.run(
      { documentId: "d1", find: "{{name}}", replace: "Ada", matchCase: false },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain(":batchUpdate");
    const body = JSON.parse(String(calls[0]?.init?.body)) as {
      requests: ReplaceAllRequest[];
    };
    const req = body.requests[0]?.replaceAllText;
    expect(req?.containsText?.text).toBe("{{name}}");
    expect(req?.containsText?.matchCase).toBe(false);
    expect(req?.replaceText).toBe("Ada");
    expect(req?.tabsCriteria).toBeUndefined();
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.occurrencesChanged).toBe(3);
  });

  it("occurrencesChanged 0 is a success (no throw)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        replies: [{ replaceAllText: { occurrencesChanged: 0 } }],
      })) as typeof globalThis.fetch;

    const { data: result } = await replaceAllTextDefinition.run(
      { documentId: "d1", find: "nope", replace: "x", matchCase: false },
      { fetch: fakeFetch },
    );

    expect(result.occurrencesChanged).toBe(0);
  });

  it("tabId restricts scope via tabsCriteria.tabIds", async () => {
    const calls: Call[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        replies: [{ replaceAllText: { occurrencesChanged: 1 } }],
      });
    }) as typeof globalThis.fetch;

    await replaceAllTextDefinition.run(
      {
        documentId: "d1",
        find: "a",
        replace: "b",
        matchCase: true,
        tabId: "t.3",
      },
      { fetch: fakeFetch },
    );

    const body = JSON.parse(String(calls[0]?.init?.body)) as {
      requests: ReplaceAllRequest[];
    };
    const req = body.requests[0]?.replaceAllText;
    expect(req?.containsText?.matchCase).toBe(true);
    expect(req?.tabsCriteria?.tabIds).toEqual(["t.3"]);
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

    const err = await replaceAllTextDefinition
      .run(
        { documentId: "missing", find: "a", replace: "b", matchCase: false },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err instanceof Error).toBe(true);
    expect((err as Error).message).toContain("404");
  });
});
