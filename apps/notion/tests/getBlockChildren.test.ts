import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getBlockChildrenDefinition from "../scripts/getBlockChildren.ts";

const { inputSchema, outputSchema } = getBlockChildrenDefinition;

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
      object: "block",
      id: "2f0e1d2c-3b4a-5968-7766-554433221100",
      type: "paragraph",
      has_children: false,
    },
  ],
  has_more: false,
  next_cursor: null,
};

describe("getBlockChildren: inputSchema", () => {
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

describe("getBlockChildren: governance", () => {
  it("is read-only", () => {
    expect(getBlockChildrenDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("getBlockChildren: run", () => {
  it("GETs /v1/blocks/{id}/children, applies the default page_size, and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(LIST);
    }) as typeof globalThis.fetch;

    const { data: result } = await getBlockChildrenDefinition.run(
      { block_id: "2f0e1d2c-3b4a-5968-7766-554433221100" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]?.url as string);
    expect(url.origin + url.pathname).toBe(
      "https://api.notion.com/v1/blocks/2f0e1d2c-3b4a-5968-7766-554433221100/children",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    // page_size defaults to 10 when omitted (query default-limit).
    expect(url.searchParams.get("page_size")).toBe("10");
    expect((calls[0]?.init?.headers as Headers).get("Notion-Version")).toBe(
      "2025-09-03",
    );
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.results).toHaveLength(1);
  });

  it("normalizes a pasted Notion URL to a dashed UUID in the path", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(LIST);
    }) as typeof globalThis.fetch;

    await getBlockChildrenDefinition.run(
      {
        block_id:
          "https://www.notion.so/My-Page-2f0e1d2c3b4a59687766554433221100",
      },
      { fetch: fakeFetch },
    );

    const url = new URL(calls[0]?.url as string);
    expect(url.origin + url.pathname).toBe(
      "https://api.notion.com/v1/blocks/2f0e1d2c-3b4a-5968-7766-554433221100/children",
    );
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

    const err = await getBlockChildrenDefinition
      .run({ block_id: "abc" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
