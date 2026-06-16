#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { notionFetch } from "../lib/notionFetch.ts";

const inputSchema = z
  .object({
    parent: z
      .object({
        data_source_id: z
          .string()
          .describe(
            "Create a row in this data source. Get it from getDatabase (data_sources[].id) or search (filter data_source).",
          )
          .optional(),
        page_id: z
          .string()
          .describe("Create a sub-page under this page.")
          .optional(),
      })
      .strict()
      .describe(
        "Where to create the page. Provide EXACTLY ONE of data_source_id (create a row in a data source) or page_id (create a sub-page). data_source_id comes from getDatabase/search, NOT a database id.",
      ),
    properties: z
      .record(z.string(), z.any())
      .describe(
        "Property values keyed by property NAME (data-source rows). At minimum the title property is usually required. Value shapes are type-specific; discover via getDataSource.",
      )
      .optional(),
    children: z
      .array(
        z
          .object({ type: z.string().describe("The block type").optional() })
          .catchall(z.json())
          .describe(
            "A block object. Has a `type` (e.g. paragraph, heading_1, to_do) plus a key matching that type carrying its content.",
          ),
      )
      .describe(
        "Optional body content as block objects (max 100, 2 levels deep). See references/notion-blocks.md.",
      )
      .optional(),
    icon: z
      .record(z.string(), z.any())
      .describe('Page icon, e.g. { type "emoji", emoji "📄" }.')
      .optional(),
    cover: z
      .record(z.string(), z.any())
      .describe("Page cover image (external file object).")
      .optional(),
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
    icon: z.record(z.string(), z.any()).optional(),
    cover: z.record(z.string(), z.any()).optional(),
  })
  .describe("A Notion page (a standalone page or a row in a data source).");

const definition = defineTool({
  name: "createPage",
  title: "Create Page",
  description:
    "Create a page — either a row in a data source (parent.data_source_id) or a sub-page under a page (parent.page_id). Property keys/types come from the data source schema (getDataSource). Add body content via children blocks.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "notion",
  run: async (input, ctx) => {
    const url = `https://api.notion.com/v1/pages`;
    const body: Record<string, unknown> = {};
    if (input.parent !== undefined) body["parent"] = input.parent;
    if (input.properties !== undefined) body["properties"] = input.properties;
    if (input.children !== undefined) body["children"] = input.children;
    if (input.icon !== undefined) body["icon"] = input.icon;
    if (input.cover !== undefined) body["cover"] = input.cover;
    const res = await notionFetch(ctx.fetch, "createPage", url, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
