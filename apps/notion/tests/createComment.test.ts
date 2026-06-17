import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createCommentDefinition from "../scripts/createComment.ts";

const { inputSchema, outputSchema } = createCommentDefinition;

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

const COMMENT = {
  object: "comment",
  id: "1429989f-e8ac-4eff-bc8f-57f56486db54",
  discussion_id: "disc-1",
  rich_text: [{ text: { content: "Looks good!" } }],
};

const RICH_TEXT = [{ text: { content: "Looks good!" } }];

describe("createComment: inputSchema", () => {
  it("requires rich_text", () => {
    expect(
      inputSchema.safeParse({ parent: { page_id: "page-1" } }).success,
    ).toBe(false);
  });

  it("accepts rich_text + parent (start a thread)", () => {
    expect(
      inputSchema.safeParse({
        parent: { page_id: "page-1" },
        rich_text: RICH_TEXT,
      }).success,
    ).toBe(true);
  });

  it("accepts rich_text + discussion_id (reply to a thread)", () => {
    expect(
      inputSchema.safeParse({
        discussion_id: "disc-1",
        rich_text: RICH_TEXT,
      }).success,
    ).toBe(true);
  });

  it("rejects providing BOTH parent and discussion_id (mutually exclusive)", () => {
    expect(
      inputSchema.safeParse({
        parent: { page_id: "page-1" },
        discussion_id: "disc-1",
        rich_text: RICH_TEXT,
      }).success,
    ).toBe(false);
  });
});

describe("createComment: governance", () => {
  it("is a write (not read-only)", () => {
    expect(createCommentDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("createComment: run", () => {
  it("POSTs to /v1/comments with the passed fields and returns the parsed comment", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(COMMENT);
    }) as typeof globalThis.fetch;

    const { data: result } = await createCommentDefinition.run(
      {
        parent: { page_id: "page-1" },
        rich_text: RICH_TEXT,
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.notion.com/v1/comments");
    expect(calls[0]?.init?.method).toBe("POST");
    expect((calls[0]?.init?.headers as Headers).get("Notion-Version")).toBe(
      "2025-09-03",
    );
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      parent: { page_id: "page-1" },
      rich_text: RICH_TEXT,
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe(COMMENT.id);
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { object: "error", code: "validation_error", message: "bad parent" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await createCommentDefinition
      .run(
        { parent: { page_id: "page-1" }, rich_text: RICH_TEXT },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
