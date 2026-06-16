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
    properties: z
      .record(z.string(), z.any())
      .describe(
        "Property values keyed by property NAME. Each value's shape depends on its type (e.g. title, rich_text, select, date). Discover valid keys/types via getDataSource. See references/notion-properties.md.",
      )
      .optional(),
    parent: z
      .object({
        data_source_id: z
          .string()
          .describe("Move the page to be a row in this data source.")
          .optional(),
        page_id: z
          .string()
          .describe("Move the page to be a sub-page of this page.")
          .optional(),
      })
      .strict()
      .describe(
        "Move the page to a new parent. Provide EXACTLY ONE of data_source_id (move into a data source) or page_id (move under a page). Omit to leave the page where it is.",
      )
      .optional(),
    in_trash: z
      .boolean()
      .describe("Set true to archive (move to trash), false to restore.")
      .optional(),
    icon: z
      .record(z.string(), z.any())
      .describe(
        'Page icon, e.g. { type "emoji", emoji "📄" } or an external file.',
      )
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
  name: "updatePage",
  title: "Update Page",
  description:
    "Update a page's property values, icon, cover, parent (move), or trash state. To archive a page set in_trash true; to restore set it false. Property keys come from the parent data source's schema (getDataSource).",
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
    const url = `https://api.notion.com/v1/pages/${encodeURIComponent(normalizeNotionId(input.page_id))}`;
    const body: Record<string, unknown> = {};
    if (input.properties !== undefined) body["properties"] = input.properties;
    if (input.parent !== undefined) body["parent"] = input.parent;
    if (input.in_trash !== undefined) body["in_trash"] = input.in_trash;
    if (input.icon !== undefined) body["icon"] = input.icon;
    if (input.cover !== undefined) body["cover"] = input.cover;
    const res = await notionFetch(ctx.fetch, "updatePage", url, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
