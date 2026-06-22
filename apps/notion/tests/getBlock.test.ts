import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getBlockDefinition from "../scripts/getBlock.ts";

const { inputSchema, outputSchema } = getBlockDefinition;

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
};

describe("getBlock: inputSchema", () => {
  it("requires block_id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ block_id: "abc" }).success).toBe(true);
  });
});

describe("getBlock: governance", () => {
  it("is read-only", () => {
    expect(getBlockDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("getBlock: run", () => {
  it("GETs /v1/blocks/{id} and returns the parsed block", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(BLOCK);
    }) as typeof globalThis.fetch;

    const { data: result } = await getBlockDefinition.run(
      { block_id: "1429989f-e8ac-4eff-bc8f-57f56486db54" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.notion.com/v1/blocks/1429989f-e8ac-4eff-bc8f-57f56486db54",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect((calls[0]?.init?.headers as Headers).get("Notion-Version")).toBe(
      "2025-09-03",
    );
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.type).toBe("paragraph");
  });

  it("normalizes a pasted Notion URL to a dashed UUID in the path", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(BLOCK);
    }) as typeof globalThis.fetch;

    await getBlockDefinition.run(
      { block_id: "https://www.notion.so/X-1429989fe8ac4effbc8f57f56486db54" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.notion.com/v1/blocks/1429989f-e8ac-4eff-bc8f-57f56486db54",
    );
  });

  it("throws a ConnectorHttpError on 404 (not found / not shared)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          object: "error",
          code: "object_not_found",
          message: "Could not find block",
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getBlockDefinition
      .run({ block_id: "abc" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
