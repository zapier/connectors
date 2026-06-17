import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getPagePropertyDefinition from "../scripts/getPageProperty.ts";

const { inputSchema, outputSchema } = getPagePropertyDefinition;

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

const PROPERTY = { object: "property_item", type: "number" };

describe("getPageProperty: inputSchema", () => {
  it("requires page_id and property_id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ page_id: "abc" }).success).toBe(false);
    expect(
      inputSchema.safeParse({ page_id: "abc", property_id: "title" }).success,
    ).toBe(true);
  });

  it("keeps page_size and start_cursor optional", () => {
    expect(
      inputSchema.safeParse({
        page_id: "abc",
        property_id: "title",
        page_size: 50,
        start_cursor: "cursor",
      }).success,
    ).toBe(true);
  });
});

describe("getPageProperty: governance", () => {
  it("is read-only", () => {
    expect(getPagePropertyDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("getPageProperty: run", () => {
  it("GETs /v1/pages/{id}/properties/{property_id} and returns the parsed property", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(PROPERTY);
    }) as typeof globalThis.fetch;

    const { data: result } = await getPagePropertyDefinition.run(
      {
        page_id: "1429989f-e8ac-4eff-bc8f-57f56486db54",
        property_id: "title",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.notion.com/v1/pages/1429989f-e8ac-4eff-bc8f-57f56486db54/properties/title",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect((calls[0]?.init?.headers as Headers).get("Notion-Version")).toBe(
      "2025-09-03",
    );
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.type).toBe("number");
  });

  it("normalizes the pasted page URL but leaves property_id as-is", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(PROPERTY);
    }) as typeof globalThis.fetch;

    await getPagePropertyDefinition.run(
      {
        page_id: "https://www.notion.so/X-1429989fe8ac4effbc8f57f56486db54",
        property_id: "title",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.notion.com/v1/pages/1429989f-e8ac-4eff-bc8f-57f56486db54/properties/title",
    );
  });

  it("throws a ConnectorHttpError on 404 (not found / not shared)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          object: "error",
          code: "object_not_found",
          message: "Could not find property",
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getPagePropertyDefinition
      .run({ page_id: "abc", property_id: "title" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
