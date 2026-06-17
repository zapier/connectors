import { describe, expect, it } from "vitest";

import copyPageDefinition from "../scripts/copyPage.ts";

const { inputSchema, outputSchema } = copyPageDefinition;

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

const SOURCE_PAGE = {
  object: "page",
  id: "1429989f-e8ac-4eff-bc8f-57f56486db54",
  properties: {
    Name: {
      id: "title",
      type: "title",
      title: [{ text: { content: "Doc A" } }],
    },
  },
};
const SOURCE_BLOCKS = {
  object: "list",
  results: [
    {
      object: "block",
      id: "bbbbbbbb-0000-0000-0000-000000000001",
      type: "paragraph",
      has_children: false,
      created_time: "2026-01-01T00:00:00.000Z",
      paragraph: { rich_text: [{ text: { content: "Body" } }] },
    },
  ],
  has_more: false,
};
const NEW_PAGE = {
  object: "page",
  id: "2530aaaf-1111-4222-8333-444455556666",
  url: "https://www.notion.so/new-page",
};

describe("copyPage: inputSchema", () => {
  it("requires both source and target ids", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ sourcePageId: "s" }).success).toBe(false);
    expect(
      inputSchema.safeParse({ sourcePageId: "s", targetParentPageId: "t" })
        .success,
    ).toBe(true);
  });
});

describe("copyPage: run", () => {
  it("reads title + blocks from source, creates the page in target, and never mixes the two connections", async () => {
    const sourceCalls: string[] = [];
    const targetCalls: Array<{ url: string; body: string | undefined }> = [];
    const sourceFetch: typeof globalThis.fetch = (async (
      url: string,
    ): Promise<Response> => {
      sourceCalls.push(url);
      return jsonResponse(
        url.includes("/children") ? SOURCE_BLOCKS : SOURCE_PAGE,
      );
    }) as typeof globalThis.fetch;
    const targetFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ): Promise<Response> => {
      targetCalls.push({ url, body: init?.body as string | undefined });
      return jsonResponse(NEW_PAGE);
    }) as typeof globalThis.fetch;

    const { data: result } = await copyPageDefinition.run(
      {
        sourcePageId: "1429989f-e8ac-4eff-bc8f-57f56486db54",
        targetParentPageId: "tgt-parent-uuid",
      },
      { connections: { source: sourceFetch, target: targetFetch } },
    );

    // Source: one page read + one block-children read, both on the new API.
    expect(sourceCalls).toEqual([
      "https://api.notion.com/v1/pages/1429989f-e8ac-4eff-bc8f-57f56486db54",
      "https://api.notion.com/v1/blocks/1429989f-e8ac-4eff-bc8f-57f56486db54/children?page_size=100",
    ]);

    // Target: a single create under the chosen parent, with the title and the
    // appendable (read-only-stripped) blocks.
    expect(targetCalls).toHaveLength(1);
    expect(targetCalls[0]!.url).toBe("https://api.notion.com/v1/pages");
    const sent = JSON.parse(targetCalls[0]!.body!) as {
      parent: { type: string; page_id: string };
      properties: { title: { title: unknown[] } };
      children: Array<Record<string, unknown>>;
    };
    expect(sent.parent).toEqual({
      type: "page_id",
      page_id: "tgt-parent-uuid",
    });
    expect(sent.properties.title.title).toEqual([
      { text: { content: "Doc A" } },
    ]);
    expect(sent.children).toHaveLength(1);
    // Read-only fields are stripped; the type + content survive.
    expect(sent.children[0]).toEqual({
      type: "paragraph",
      paragraph: { rich_text: [{ text: { content: "Body" } }] },
    });

    expect(result.id).toBe("2530aaaf-1111-4222-8333-444455556666");
    expect(result.blocks_copied).toBe(1);
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("normalizes a pasted source URL to a dashed UUID in the source path", async () => {
    const sourceCalls: string[] = [];
    const sourceFetch: typeof globalThis.fetch = (async (
      url: string,
    ): Promise<Response> => {
      sourceCalls.push(url);
      return jsonResponse(
        url.includes("/children") ? SOURCE_BLOCKS : SOURCE_PAGE,
      );
    }) as typeof globalThis.fetch;
    const targetFetch: typeof globalThis.fetch = (async (): Promise<Response> =>
      jsonResponse(NEW_PAGE)) as typeof globalThis.fetch;

    await copyPageDefinition.run(
      {
        sourcePageId:
          "https://www.notion.so/X-1429989fe8ac4effbc8f57f56486db54",
        targetParentPageId: "t",
      },
      { connections: { source: sourceFetch, target: targetFetch } },
    );

    expect(sourceCalls[0]).toBe(
      "https://api.notion.com/v1/pages/1429989f-e8ac-4eff-bc8f-57f56486db54",
    );
  });

  it("labels a source-read failure distinctly from a target-write failure", async () => {
    const okSource: typeof globalThis.fetch = (async (
      url: string,
    ): Promise<Response> =>
      jsonResponse(
        url.includes("/children") ? SOURCE_BLOCKS : SOURCE_PAGE,
      )) as typeof globalThis.fetch;
    const failing = (status: number): typeof globalThis.fetch =>
      (async (): Promise<Response> =>
        jsonResponse(
          { object: "error", code: "x" },
          { status },
        )) as typeof globalThis.fetch;

    // Source read fails -> the read-context message.
    await expect(
      copyPageDefinition.run(
        { sourcePageId: "s", targetParentPageId: "t" },
        { connections: { source: failing(404), target: okSource } },
      ),
    ).rejects.toThrow("Failed to read the source page");

    // Source reads succeed, target write fails -> the write-context message.
    await expect(
      copyPageDefinition.run(
        { sourcePageId: "s", targetParentPageId: "t" },
        { connections: { source: okSource, target: failing(403) } },
      ),
    ).rejects.toThrow("Failed to create the page in the target workspace");
  });
});
