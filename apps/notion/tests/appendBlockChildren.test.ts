import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import appendBlockChildrenDefinition from "../skills/notion/scripts/appendBlockChildren.ts";

const { inputSchema, outputSchema } = appendBlockChildrenDefinition;

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
      id: "block-1",
      type: "paragraph",
      has_children: false,
    },
  ],
  next_cursor: null,
  has_more: false,
};

const CHILDREN = [{ type: "paragraph", paragraph: { rich_text: [] } }];

describe("appendBlockChildren: inputSchema", () => {
  it("requires block_id and children", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ block_id: "abc" }).success).toBe(false);
    expect(
      inputSchema.safeParse({ block_id: "abc", children: CHILDREN }).success,
    ).toBe(true);
  });

  it("accepts an optional after cursor", () => {
    expect(
      inputSchema.safeParse({
        block_id: "abc",
        children: CHILDREN,
        after: "block-0",
      }).success,
    ).toBe(true);
  });
});

describe("appendBlockChildren: governance", () => {
  it("is a write (not read-only)", () => {
    expect(appendBlockChildrenDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("appendBlockChildren: run", () => {
  it("PATCHes /v1/blocks/{id}/children with the children in the body and returns the parsed list", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(LIST);
    }) as typeof globalThis.fetch;

    const { data: result } = await appendBlockChildrenDefinition.run(
      {
        block_id: "1429989f-e8ac-4eff-bc8f-57f56486db54",
        children: CHILDREN,
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.notion.com/v1/blocks/1429989f-e8ac-4eff-bc8f-57f56486db54/children",
    );
    expect(calls[0]?.init?.method).toBe("PATCH");
    expect((calls[0]?.init?.headers as Headers).get("Notion-Version")).toBe(
      "2025-09-03",
    );
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      children: CHILDREN,
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.results).toHaveLength(1);
  });

  it("normalizes a pasted Notion URL to a dashed UUID in the path", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(LIST);
    }) as typeof globalThis.fetch;

    await appendBlockChildrenDefinition.run(
      {
        block_id:
          "https://www.notion.so/My-Page-1429989fe8ac4effbc8f57f56486db54",
        children: CHILDREN,
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.notion.com/v1/blocks/1429989f-e8ac-4eff-bc8f-57f56486db54/children",
    );
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { object: "error", code: "validation_error", message: "bad block" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await appendBlockChildrenDefinition
      .run({ block_id: "abc", children: CHILDREN }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
