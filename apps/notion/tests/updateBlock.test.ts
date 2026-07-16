import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import updateBlockDefinition from "../skills/notion/scripts/updateBlock.ts";

const { inputSchema, outputSchema } = updateBlockDefinition;

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

const BLOCK = {
  object: "block",
  id: "1429989f-e8ac-4eff-bc8f-57f56486db54",
  type: "paragraph",
  has_children: false,
  in_trash: false,
};

describe("updateBlock: inputSchema", () => {
  it("requires block_id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ block_id: "abc" }).success).toBe(true);
  });

  it("accepts type-keyed content under `content`", () => {
    expect(
      inputSchema.safeParse({
        block_id: "abc",
        content: {
          paragraph: { rich_text: [{ text: { content: "Updated" } }] },
        },
      }).success,
    ).toBe(true);
  });
});

describe("updateBlock: governance", () => {
  it("is a write (not read-only)", () => {
    expect(updateBlockDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("updateBlock: run", () => {
  it("PATCHes /v1/blocks/{id} with the body fields and returns the parsed block", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(BLOCK);
    }) as typeof globalThis.fetch;

    const { data: result } = await updateBlockDefinition.run(
      {
        block_id: "1429989f-e8ac-4eff-bc8f-57f56486db54",
        content: {
          paragraph: { rich_text: [{ text: { content: "Updated" } }] },
        },
        in_trash: false,
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.notion.com/v1/blocks/1429989f-e8ac-4eff-bc8f-57f56486db54",
    );
    expect(calls[0]?.init?.method).toBe("PATCH");
    expect((calls[0]?.init?.headers as Headers).get("Notion-Version")).toBe(
      "2025-09-03",
    );
    // content is spread to the body root (type key) alongside in_trash.
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      in_trash: false,
      paragraph: { rich_text: [{ text: { content: "Updated" } }] },
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe(BLOCK.id);
  });

  it("normalizes a pasted Notion URL to a dashed UUID in the path", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(BLOCK);
    }) as typeof globalThis.fetch;

    await updateBlockDefinition.run(
      {
        block_id:
          "https://www.notion.so/My-Page-1429989fe8ac4effbc8f57f56486db54",
        in_trash: true,
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.notion.com/v1/blocks/1429989f-e8ac-4eff-bc8f-57f56486db54",
    );
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { object: "error", code: "object_not_found", message: "no block" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await updateBlockDefinition
      .run({ block_id: "abc", in_trash: true }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
