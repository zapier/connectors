import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listCommentsDefinition from "../skills/notion/scripts/listComments.ts";

const { inputSchema, outputSchema } = listCommentsDefinition;

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

const LIST = {
  object: "list",
  results: [
    {
      object: "comment",
      id: "c1111111-2222-3333-4444-555566667777",
      discussion_id: "d1111111-2222-3333-4444-555566667777",
    },
  ],
  has_more: false,
  next_cursor: null,
};

describe("listComments: inputSchema", () => {
  it("requires block_id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ block_id: "abc" }).success).toBe(true);
  });

  it("accepts optional page_size + start_cursor", () => {
    expect(
      inputSchema.safeParse({
        block_id: "abc",
        page_size: 50,
        start_cursor: "cursor-1",
      }).success,
    ).toBe(true);
  });
});

describe("listComments: governance", () => {
  it("is read-only", () => {
    expect(listCommentsDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("listComments: run", () => {
  it("GETs /v1/comments with block_id, applies the default page_size, and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(LIST);
    }) as typeof globalThis.fetch;

    const { data: result } = await listCommentsDefinition.run(
      { block_id: "b1111111-2222-3333-4444-555566667777" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]?.url as string);
    expect(url.origin + url.pathname).toBe(
      "https://api.notion.com/v1/comments",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    // block_id is a required QUERY param (not a path param — no normalization).
    expect(url.searchParams.get("block_id")).toBe(
      "b1111111-2222-3333-4444-555566667777",
    );
    // page_size defaults to 20 when omitted (query default-limit).
    expect(url.searchParams.get("page_size")).toBe("20");
    expect((calls[0]?.init?.headers as Headers).get("Notion-Version")).toBe(
      "2025-09-03",
    );
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.results).toHaveLength(1);
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          object: "error",
          code: "object_not_found",
          message: "Could not find block",
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await listCommentsDefinition
      .run({ block_id: "abc" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
