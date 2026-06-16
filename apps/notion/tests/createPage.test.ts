import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createPageDefinition from "../scripts/createPage.ts";

const { inputSchema, outputSchema } = createPageDefinition;

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

describe("createPage: inputSchema", () => {
  it("requires parent", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(
      inputSchema.safeParse({ parent: { data_source_id: "ds-1" } }).success,
    ).toBe(true);
  });

  it("accepts the full documented body shape", () => {
    expect(
      inputSchema.safeParse({
        parent: { page_id: "page-1" },
        properties: { Name: { title: [{ text: { content: "Hi" } }] } },
        children: [{ type: "paragraph", paragraph: { rich_text: [] } }],
        icon: { type: "emoji", emoji: "📄" },
        cover: { type: "external", external: { url: "https://x/y.png" } },
      }).success,
    ).toBe(true);
  });
});

describe("createPage: governance", () => {
  it("is a write (not read-only)", () => {
    expect(createPageDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("createPage: run", () => {
  it("POSTs to /v1/pages with the parent in the body and returns the parsed page", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(PAGE);
    }) as typeof globalThis.fetch;

    const { data: result } = await createPageDefinition.run(
      {
        parent: { data_source_id: "ds-1" },
        properties: { Name: { title: [{ text: { content: "Hi" } }] } },
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.notion.com/v1/pages");
    expect(calls[0]?.init?.method).toBe("POST");
    expect((calls[0]?.init?.headers as Headers).get("Notion-Version")).toBe(
      "2025-09-03",
    );
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      parent: { data_source_id: "ds-1" },
      properties: { Name: { title: [{ text: { content: "Hi" } }] } },
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe(PAGE.id);
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { object: "error", code: "validation_error", message: "bad parent" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await createPageDefinition
      .run({ parent: { data_source_id: "ds-1" } }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
