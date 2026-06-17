#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { notionFetch } from "../lib/notionFetch.ts";

const inputSchema = z
  .object({
    block_id: z
      .string()
      .describe(
        "The page or block id whose comments to list (UUID, with or without dashes).",
      ),
    page_size: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe(
        "Results per page (max 100). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    start_cursor: z
      .string()
      .describe("Pagination cursor from a previous response's next_cursor.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  object: z.literal("list"),
  results: z.array(
    z
      .object({
        object: z.literal("comment"),
        id: z.string().describe("The comment id."),
        parent: z
          .record(z.string(), z.json())
          .describe("The container this comment belongs to (a page or block).")
          .optional(),
        discussion_id: z
          .string()
          .describe("The thread id; pass to createComment to reply."),
        created_time: z.string().datetime({ offset: true }).optional(),
        created_by: z
          .record(z.string(), z.json())
          .describe("The user who created the comment.")
          .optional(),
        rich_text: z
          .array(z.record(z.string(), z.json()))
          .describe("The comment body as rich-text objects.")
          .optional(),
      })
      .describe("A comment on a page or block."),
  ),
  next_cursor: z.union([z.string(), z.null()]).optional(),
  has_more: z.boolean(),
});

const definition = defineTool({
  name: "listComments",
  title: "List Comments",
  description:
    "List unresolved comments on a page or block. Pass the page or block id as block_id.",
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
    const url = new URL(`https://api.notion.com/v1/comments`);
    if (input.block_id !== undefined) {
      url.searchParams.set("block_id", String(input.block_id));
    }
    url.searchParams.set("page_size", String(input.page_size ?? 20));
    if (input.start_cursor !== undefined) {
      url.searchParams.set("start_cursor", String(input.start_cursor));
    }
    const res = await notionFetch(ctx.fetch, url.toString(), {
      method: "GET",
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
