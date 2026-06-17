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
const outputSchema = z
  .object({
    object: z.string().describe('Always "page".'),
    id: z.string().describe("The page id (UUID)."),
    url: z.string().describe("The page URL in the Notion app."),
    created_time: z.string().datetime({ offset: true }).optional(),
    last_edited_time: z.string().datetime({ offset: true }).optional(),
    in_trash: z
      .boolean()
      .describe("True if the page is in the trash.")
      .optional(),
    parent: z
      .object({
        type: z
          .string()
          .describe(
            "One of data_source_id, page_id, database_id, block_id, or workspace.",
          )
          .optional(),
        data_source_id: z.string().optional(),
        page_id: z.string().optional(),
        database_id: z.string().optional(),
        block_id: z.string().optional(),
      })
      .describe("The container this object belongs to."),
    properties: z
      .record(z.string(), z.any())
      .describe(
        "Property values keyed by property name. Shapes are type-specific (title, rich_text, select, date, relation, etc.).",
      )
      .optional(),
    icon: z.record(z.string(), z.any()).nullable().optional(),
    cover: z.record(z.string(), z.any()).nullable().optional(),
  })
  .describe("A Notion page (a standalone page or a row in a data source).");

const definition = defineTool({
  name: "getPage",
  title: "Get Page",
  description:
    "Retrieve a page's metadata and property values by id. Returns properties but not the page body content — use getBlockChildren or getPageAsMarkdown for the content.",
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
    const url = `https://api.notion.com/v1/pages/${encodeURIComponent(normalizeNotionId(input.page_id))}`;
    const res = await notionFetch(ctx.fetch, "getPage", url, { method: "GET" });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
