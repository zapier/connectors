#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { NOTION_VERSION } from "../lib/notionFetch.ts";
import { normalizeNotionId } from "../lib/notionId.ts";

// Fields Notion returns when you READ a block but rejects when you POST one
// back. Strip them so a block copied from the source page is a valid append
// payload (the appendable shape is just `{ type, <type>: { ... } }`).
const READ_ONLY_BLOCK_KEYS = new Set([
  "id",
  "object",
  "created_time",
  "last_edited_time",
  "created_by",
  "last_edited_by",
  "has_children",
  "parent",
  "in_trash",
  "archived",
]);

function toAppendableBlock(
  block: Record<string, unknown>,
): Record<string, unknown> {
  const appendable: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(block)) {
    if (!READ_ONLY_BLOCK_KEYS.has(key)) appendable[key] = value;
  }
  return appendable;
}

const inputSchema = z.strictObject({
  sourcePageId: z
    .string()
    .describe(
      "The page to copy, in the SOURCE workspace (a UUID with or without dashes, or a pasted Notion URL). Find it via search against the source workspace.",
    ),
  targetParentPageId: z
    .string()
    .describe(
      "The parent page in the TARGET workspace to create the copy under (a UUID with or without dashes, or a pasted Notion URL). Notion requires every page to have a page or data-source parent.",
    ),
});
const outputSchema = z.object({
  object: z.literal("page"),
  id: z.string().describe("The new page id in the target workspace."),
  url: z.string().describe("The new page URL in the target workspace."),
  blocks_copied: z
    .number()
    .int()
    .describe("How many top-level content blocks were copied from the source."),
});

const definition = defineTool({
  name: "copyPage",
  title: "Copy Page Between Workspaces",
  description:
    "Copy a page from the source Notion workspace to the target workspace, under a chosen parent page. Copies the page title and its top-level content blocks; nested child blocks are not recursed. Requires two Notion connections (source and target).",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  // Two slots, both resolved by the shared `notion` chain — the cross-workspace
  // copy is the connector's multi-connection exemplar.
  connections: { source: "notion", target: "notion" },
  run: async (input, ctx) => {
    const sourceId = normalizeNotionId(input.sourcePageId);
    const targetParentId = normalizeNotionId(input.targetParentPageId);
    const versionHeader = { "Notion-Version": NOTION_VERSION };

    // 1. Read the source page; its title lives in the title-typed property.
    const pageRes = await ctx.connections.source(
      `https://api.notion.com/v1/pages/${encodeURIComponent(sourceId)}`,
      { method: "GET", headers: versionHeader },
    );
    await throwIfNotOk(pageRes, "Failed to read the source page");
    const sourcePage = (await pageRes.json()) as {
      properties?: Record<string, { type?: string; title?: unknown }>;
    };
    const titleProperty = Object.values(sourcePage.properties ?? {}).find(
      (property) => property?.type === "title",
    );
    const title = (titleProperty?.title as unknown[]) ?? [];

    // 2. Read the source page's top-level content blocks.
    const blocksRes = await ctx.connections.source(
      `https://api.notion.com/v1/blocks/${encodeURIComponent(sourceId)}/children?page_size=100`,
      { method: "GET", headers: versionHeader },
    );
    await throwIfNotOk(blocksRes, "Failed to read the source page's content");
    const sourceBlocks = (await blocksRes.json()) as {
      results?: Array<Record<string, unknown>>;
    };
    const children = (sourceBlocks.results ?? []).map(toAppendableBlock);

    // 3. Create the copy in the target workspace under the chosen parent page.
    const createRes = await ctx.connections.target(
      "https://api.notion.com/v1/pages",
      {
        method: "POST",
        headers: { ...versionHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          parent: { type: "page_id", page_id: targetParentId },
          properties: { title: { title } },
          children: children.slice(0, 100),
        }),
      },
    );
    await throwIfNotOk(
      createRes,
      "Failed to create the page in the target workspace",
    );
    const newPage = (await createRes.json()) as {
      object: "page";
      id: string;
      url: string;
    };

    return {
      object: newPage.object,
      id: newPage.id,
      url: newPage.url,
      blocks_copied: children.length,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
