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
    page_size: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe(
        "Results per page (max 100). Defaults to 10 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    start_cursor: z
      .string()
      .describe("Pagination cursor from a previous response's next_cursor.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  object: z.string().describe('Always "list".'),
  results: z.array(
    z
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
      .describe("A Notion block (a unit of page content)."),
  ),
  next_cursor: z.union([z.string(), z.null()]).optional(),
  has_more: z.boolean(),
});

const definition = defineTool({
  name: "getBlockChildren",
  title: "Get Block Children",
  description:
    "List the child blocks (body content) of a page or block. A page id is a valid block id. Returns one level; blocks with has_children true require a follow-up call. Prefer getPageAsMarkdown for plain reading.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "notion",
  run: async (input, ctx) => {
    const url = new URL(
      `https://api.notion.com/v1/blocks/${encodeURIComponent(normalizeNotionId(input.block_id))}/children`,
    );
    url.searchParams.set("page_size", String(input.page_size ?? 10));
    if (input.start_cursor !== undefined) {
      url.searchParams.set("start_cursor", String(input.start_cursor));
    }
    const res = await notionFetch(
      ctx.fetch,
      "getBlockChildren",
      url.toString(),
      {
        method: "GET",
      },
    );
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
