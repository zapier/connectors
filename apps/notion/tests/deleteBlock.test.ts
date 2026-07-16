import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import deleteBlockDefinition from "../skills/notion/scripts/deleteBlock.ts";

const { inputSchema, outputSchema } = deleteBlockDefinition;

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
  in_trash: true,
};

describe("deleteBlock: inputSchema", () => {
  it("requires block_id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ block_id: "abc" }).success).toBe(true);
  });
});

describe("deleteBlock: governance", () => {
  it("is a write (not read-only)", () => {
    expect(deleteBlockDefinition.annotations?.readOnlyHint).toBe(false);
  });

  it("is destructive", () => {
    expect(deleteBlockDefinition.annotations?.destructiveHint).toBe(true);
  });
});

describe("deleteBlock: run", () => {
  it("DELETEs /v1/blocks/{id} and returns the parsed (trashed) block", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(BLOCK);
    }) as typeof globalThis.fetch;

    const { data: result } = await deleteBlockDefinition.run(
      { block_id: "1429989f-e8ac-4eff-bc8f-57f56486db54" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.notion.com/v1/blocks/1429989f-e8ac-4eff-bc8f-57f56486db54",
    );
    expect(calls[0]?.init?.method).toBe("DELETE");
    expect((calls[0]?.init?.headers as Headers).get("Notion-Version")).toBe(
      "2025-09-03",
    );
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe(BLOCK.id);
    expect(result.in_trash).toBe(true);
  });

  it("normalizes a pasted Notion URL to a dashed UUID in the path", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(BLOCK);
    }) as typeof globalThis.fetch;

    await deleteBlockDefinition.run(
      {
        block_id:
          "https://www.notion.so/My-Page-1429989fe8ac4effbc8f57f56486db54",
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

    const err = await deleteBlockDefinition
      .run({ block_id: "abc" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
