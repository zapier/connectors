#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { notionFetch } from "../lib/notionFetch.ts";

const inputSchema = z
  .object({
    parent: z
      .object({ type: z.literal("page_id").optional(), page_id: z.string() })
      .strict()
      .describe('The parent page. Shape { type "page_id", page_id "<uuid>" }.'),
    title: z
      .array(z.record(z.string(), z.any()))
      .describe(
        'Database title as a rich-text array, e.g. [{ text { content "Projects" } }].',
      )
      .optional(),
    initial_data_source: z
      .record(z.string(), z.any())
      .describe(
        'The first data source\'s schema. Shape { properties { "<Name>" { <type-config> } } } and must include exactly one title property. See references/notion-properties.md.',
      )
      .optional(),
    icon: z
      .record(z.string(), z.any())
      .describe('Database icon, e.g. { type "emoji", emoji "📊" }.')
      .optional(),
  })
  .strict();
const outputSchema = z
  .object({
    object: z.string().describe('Always "database".'),
    id: z.string().describe("The database id (UUID)."),
    title: z
      .array(z.record(z.string(), z.any()))
      .describe("The database title as a rich-text array.")
      .optional(),
    data_sources: z
      .array(
        z.object({
          id: z.string().describe("The data source id.").optional(),
          name: z.string().describe("The data source name.").optional(),
        }),
      )
      .describe(
        "The child data sources. Use a data source id with getDataSource or queryDataSource.",
      ),
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
      .describe("The container this object belongs to.")
      .optional(),
    url: z.string().optional(),
    in_trash: z.boolean().optional(),
  })
  .describe("A Notion database container holding one or more data sources.");

const definition = defineTool({
  name: "createDatabase",
  title: "Create Database",
  description:
    "Create a database under a parent page, with an initial data source and its property schema. Pass the parent page id.",
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
    const url = `https://api.notion.com/v1/databases`;
    const body: Record<string, unknown> = {};
    if (input.parent !== undefined) body["parent"] = input.parent;
    if (input.title !== undefined) body["title"] = input.title;
    if (input.initial_data_source !== undefined)
      body["initial_data_source"] = input.initial_data_source;
    if (input.icon !== undefined) body["icon"] = input.icon;
    const res = await notionFetch(ctx.fetch, "createDatabase", url, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
