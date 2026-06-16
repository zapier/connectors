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
  })
  .strict();
const outputSchema = z
  .object({
    object: z.string().describe('Always "block".'),
    id: z.string().describe("The block id (UUID)."),
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
  .describe("A Notion block (a unit of page content).");

const definition = defineTool({
  name: "deleteBlock",
  title: "Delete Block",
  description:
    "Delete a block by id (moves it to the trash). The block id can be a child block or a page (a page is a block). Returns the deleted block with in_trash true.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "notion",
  run: async (input, ctx) => {
    const url = `https://api.notion.com/v1/blocks/${encodeURIComponent(normalizeNotionId(input.block_id))}`;
    const res = await notionFetch(ctx.fetch, "deleteBlock", url, {
      method: "DELETE",
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
