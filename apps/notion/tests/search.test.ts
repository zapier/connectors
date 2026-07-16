import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import searchDefinition from "../skills/notion/scripts/search.ts";

const { inputSchema, outputSchema } = searchDefinition;

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

describe("search: inputSchema", () => {
  it("accepts a minimal query", () => {
    expect(inputSchema.safeParse({ query: "Q4 planning" }).success).toBe(true);
  });

  it("accepts an empty input (lists everything shared)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts the documented filter shape", () => {
    expect(
      inputSchema.safeParse({
        query: "Projects",
        filter: { property: "object", value: "data_source" },
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown filter value", () => {
    expect(
      inputSchema.safeParse({ filter: { property: "object", value: "user" } })
        .success,
    ).toBe(false);
  });
});

describe("search: governance", () => {
  it("is read-only despite being a POST", () => {
    expect(searchDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("search: run", () => {
  it("POSTs to /v1/search, applies the default page_size, and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        object: "list",
        results: [{ id: "abc", object: "page" }],
        has_more: false,
        next_cursor: null,
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await searchDefinition.run(
      { query: "Q4 planning" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.notion.com/v1/search");
    expect(calls[0]?.init?.method).toBe("POST");
    // page_size defaults to 10 when omitted (body default-limit).
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      query: "Q4 planning",
      page_size: 10,
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.results).toHaveLength(1);
  });

  it("sets the Notion-Version and Content-Type headers", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({
        object: "list",
        results: [],
        has_more: false,
        next_cursor: null,
      });
    }) as typeof globalThis.fetch;

    await searchDefinition.run({ query: "x" }, { fetch: fakeFetch });

    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("Notion-Version")).toBe("2025-09-03");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("throws a ConnectorHttpError carrying the status + parsed body on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { object: "error", code: "validation_error", message: "bad query" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await searchDefinition
      .run({ query: "x" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(400);
    expect(httpErr.response.body).toMatchObject({ code: "validation_error" });
  });
});
