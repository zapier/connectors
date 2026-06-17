#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { notionFetch } from "../lib/notionFetch.ts";
import { normalizeNotionId } from "../lib/notionId.ts";

const inputSchema = z
  .object({
    page_id: z
      .string()
      .describe(
        "The page id (UUID, with or without dashes). Resolve a title to an id via search.",
      ),
  })
  .strict();
const outputSchema = z.object({
  object: z.literal("page_markdown").optional(),
  id: z.string().describe("The page id (UUID).").optional(),
  markdown: z.string().describe("The page body rendered as Markdown."),
  truncated: z
    .boolean()
    .describe(
      "True if the page exceeded the response size limit and the markdown was cut off. When true, the omitted subtrees are listed in unknown_block_ids.",
    )
    .optional(),
  unknown_block_ids: z
    .array(z.string())
    .describe(
      "Ids of blocks not rendered into the markdown (large or unsupported subtrees on a truncated page). Read them separately via getBlockChildren / getBlock.",
    )
    .optional(),
});

const definition = defineTool({
  name: "getPageAsMarkdown",
  title: "Get Page As Markdown",
  description:
    "Retrieve a page's full body content rendered as Markdown text. Preferred over getBlockChildren when the agent needs to read or summarize a page (no block-JSON parsing). On a very large page the result can be truncated — check `truncated` and fetch the omitted `unknown_block_ids` separately.",
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
    const url = `https://api.notion.com/v1/pages/${encodeURIComponent(normalizeNotionId(input.page_id))}/markdown`;
    const res = await notionFetch(ctx.fetch, "getPageAsMarkdown", url, {
      method: "GET",
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
