import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import updatePageDefinition from "../skills/notion/scripts/updatePage.ts";

const { inputSchema, outputSchema } = updatePageDefinition;

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

const PAGE = {
  object: "page",
  id: "1429989f-e8ac-4eff-bc8f-57f56486db54",
  url: "https://www.notion.so/My-Page-1429989fe8ac4effbc8f57f56486db54",
  parent: { type: "data_source_id", data_source_id: "ds-1" },
};

describe("updatePage: inputSchema", () => {
  it("requires page_id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ page_id: "abc" }).success).toBe(true);
  });

  it("accepts properties / in_trash / parent / icon / cover", () => {
    expect(
      inputSchema.safeParse({
        page_id: "abc",
        properties: { Status: { select: { name: "Done" } } },
        in_trash: true,
        parent: { page_id: "page-1" },
        icon: { type: "emoji", emoji: "📄" },
        cover: { type: "external", external: { url: "https://x/y.png" } },
      }).success,
    ).toBe(true);
  });
});

describe("updatePage: governance", () => {
  it("is a write (not read-only)", () => {
    expect(updatePageDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("updatePage: run", () => {
  it("PATCHes /v1/pages/{id} with the fields in the body and returns the parsed page", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(PAGE);
    }) as typeof globalThis.fetch;

    const { data: result } = await updatePageDefinition.run(
      {
        page_id: "1429989f-e8ac-4eff-bc8f-57f56486db54",
        properties: { Status: { select: { name: "Done" } } },
        in_trash: true,
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.notion.com/v1/pages/1429989f-e8ac-4eff-bc8f-57f56486db54",
    );
    expect(calls[0]?.init?.method).toBe("PATCH");
    expect((calls[0]?.init?.headers as Headers).get("Notion-Version")).toBe(
      "2025-09-03",
    );
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      properties: { Status: { select: { name: "Done" } } },
      in_trash: true,
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe(PAGE.id);
  });

  it("normalizes a pasted Notion URL to a dashed UUID in the path", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(PAGE);
    }) as typeof globalThis.fetch;

    await updatePageDefinition.run(
      {
        page_id:
          "https://www.notion.so/My-Page-1429989fe8ac4effbc8f57f56486db54",
        in_trash: false,
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.notion.com/v1/pages/1429989f-e8ac-4eff-bc8f-57f56486db54",
    );
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { object: "error", code: "object_not_found", message: "no page" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await updatePageDefinition
      .run({ page_id: "abc", in_trash: true }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
