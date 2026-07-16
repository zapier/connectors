#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { notionFetch } from "../lib/notionFetch.ts";
import { normalizeNotionId } from "../lib/notionId.ts";

const inputSchema = z
  .object({
    block_id: z
      .string()
      .describe(
        "The block id, or a page id (a page is a block). UUID, with or without dashes.",
      ),
    children: z
      .array(
        z
          .object({ type: z.string().describe("The block type").optional() })
          .catchall(z.json())
          .describe(
            "A block object. Has a `type` plus a key matching that type carrying its content.",
          ),
      )
      .describe(
        'Block objects to append (max 100 per call, 2 levels of nesting). E.g. a paragraph { "type": "paragraph", "paragraph": { "rich_text": [...] } }. See references/notion-blocks.md.',
      ),
    after: z
      .string()
      .describe(
        "Optional id of an existing child block to insert the new blocks after. Omit to append at the end.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  object: z.literal("list"),
  results: z.array(
    z
      .object({
        object: z.literal("block"),
        id: z.string().describe("The block id."),
        type: z
          .string()
          .describe("The block type (e.g. paragraph, heading_1, to_do)."),
        has_children: z
          .boolean()
          .describe(
            "True if the block has nested child blocks (fetch via getBlockChildren).",
          )
          .optional(),
        in_trash: z.boolean().optional(),
        created_time: z.string().datetime({ offset: true }).optional(),
        last_edited_time: z.string().datetime({ offset: true }).optional(),
      })
      .catchall(z.json())
      .describe("A Notion block (a unit of page content)."),
  ),
  next_cursor: z.union([z.string(), z.null()]).optional(),
  has_more: z.boolean(),
});

const definition = defineTool({
  name: "appendBlockChildren",
  title: "Append Block Children",
  description:
    "Append content blocks to the end of a page or block (or after a specific child via after). Use to add paragraphs, headings, lists, to-dos, etc. Each block is a Notion block object; see references/notion-blocks.md.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "notion",
  run: async (input, ctx) => {
    const url = `https://api.notion.com/v1/blocks/${encodeURIComponent(normalizeNotionId(input.block_id))}/children`;
    const body: Record<string, unknown> = {};
    if (input.children !== undefined) body["children"] = input.children;
    if (input.after !== undefined) body["after"] = input.after;
    const res = await notionFetch(ctx.fetch, url, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
