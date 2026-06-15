import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import searchDefinition from "../scripts/search.ts";

const { inputSchema, outputSchema } = searchDefinition;

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
  it("flags read-only search", () => {
    expect(searchDefinition.annotations?.readOnlyHint).toBe(true);
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

    const { data: result } = await searchDefinition.run(
      { query: "Q4 planning" },
      { fetch: fakeFetch },
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

    await searchDefinition.run({ query: "x" }, { fetch: fakeFetch });

    const headers = calls[0]?.init?.headers as Record<string, string>;
    expect(headers["Notion-Version"]).toBe("2022-06-28");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("throws a ConnectorHttpError carrying the status and parsed body on non-OK", async () => {
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
    expect(httpErr.message).toMatch(/HTTP 400/);
    expect(httpErr.response.status).toBe(400);
    // The Notion error code isn't promoted to a top-level field, but the full
    // body is captured transparently for the agent/CLI to inspect.
    expect(httpErr.response.body).toMatchObject({ code: "validation_error" });
  });
});
