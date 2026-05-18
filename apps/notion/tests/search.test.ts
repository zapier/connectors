import { describe, expect, it } from "vitest";
import search from "../scripts/search.ts";

const { inputSchema, outputSchema } = search;

function jsonResponse(
  body: unknown,
  init: { status?: number; ok?: boolean } = {},
): Response {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

describe("search: inputSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(inputSchema.safeParse({ query: "Q4 planning" }).success).toBe(true);
  });

  it("accepts the documented filter shape", () => {
    expect(
      inputSchema.safeParse({
        query: "Projects",
        filter: { property: "object", value: "database" },
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown filter value", () => {
    expect(
      inputSchema.safeParse({
        query: "Projects",
        filter: { property: "object", value: "user" },
      }).success,
    ).toBe(false);
  });

  it("rejects page_size outside Notion's accepted range", () => {
    expect(inputSchema.safeParse({ query: "x", page_size: 0 }).success).toBe(
      false,
    );
    expect(inputSchema.safeParse({ query: "x", page_size: 101 }).success).toBe(
      false,
    );
    expect(inputSchema.safeParse({ query: "x", page_size: 50 }).success).toBe(
      true,
    );
  });
});

describe("search: governance", () => {
  it("flags read-only search and allow-statement URL guard", () => {
    expect(search.tool.annotations?.readOnlyHint).toBe(true);
    const statements = (
      search.tool._meta as {
        "zapier:statements"?: ReadonlyArray<{
          effect: string;
          resources: string[];
        }>;
      }
    )?.["zapier:statements"];
    expect(statements?.[0]?.effect).toBe("allow");
    expect(statements?.[0]?.resources).toContain("http");
  });
});

describe("search: run", () => {
  it("POSTs the validated input to /v1/search and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        results: [{ id: "abc", object: "page" }],
        has_more: false,
        next_cursor: null,
      });
    }) as typeof globalThis.fetch;

    const result = await search(
      { query: "Q4 planning" },
      { connection: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.notion.com/v1/search");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      query: "Q4 planning",
    });

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.results).toHaveLength(1);
  });

  it("sets Notion-Version and Content-Type on the request", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({ results: [], has_more: false, next_cursor: null });
    }) as typeof globalThis.fetch;

    await search({ query: "x" }, { connection: fakeFetch });

    const headers = calls[0]?.init?.headers as Record<string, string>;
    expect(headers["Notion-Version"]).toBe("2022-06-28");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("throws a tagged error including the response status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { object: "error", code: "validation_error", message: "bad query" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    await expect(
      search({ query: "x" }, { connection: fakeFetch }),
    ).rejects.toThrow(/Notion search 400/);
  });
});
