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
    in_trash: z
      .boolean()
      .describe("Set true to archive (delete) the block.")
      .optional(),
    content: z
      .record(z.string(), z.json())
      .describe(
        'Updated content as a single type-keyed object matching the block\'s existing type, e.g. { "paragraph": { "rich_text": [{ "text": { "content": "Updated" } }] } }. Cannot change the block type. See references/notion-blocks.md.',
      )
      .optional(),
  })
  .strict();
const outputSchema = z
  .object({
    object: z.string().describe('Always "block".'),
    id: z.string().describe("The block id (UUID)."),
    type: z.string().describe("The block type (e.g. paragraph"),
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
  .describe("A Notion block (a unit of page content).");

const definition = defineTool({
  name: "updateBlock",
  title: "Update Block",
  description:
    "Update a single block's content (pass `content` as a type-keyed object matching the block's existing type) or archive it (in_trash). Cannot change a block's type.",
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
    const url = `https://api.notion.com/v1/blocks/${encodeURIComponent(normalizeNotionId(input.block_id))}`;
    // The type-keyed content (e.g. { paragraph: {...} }) is sent at the body
    // root alongside in_trash, matching Notion's PATCH /v1/blocks/{id} shape.
    const body: Record<string, unknown> = { ...(input.content ?? {}) };
    if (input.in_trash !== undefined) body["in_trash"] = input.in_trash;
    const res = await notionFetch(ctx.fetch, "updateBlock", url, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
