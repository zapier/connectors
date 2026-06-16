#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { notionFetch } from "../lib/notionFetch.ts";
import { normalizeNotionId } from "../lib/notionId.ts";

const inputSchema = z
  .object({
    database_id: z
      .string()
      .describe(
        "The database container id (UUID). NOT a data source id. Resolve via search.",
      ),
    title: z
      .array(z.record(z.string(), z.any()))
      .describe(
        'New database title as a rich-text array, e.g. [{ text { content "Projects" } }].',
      )
      .optional(),
    icon: z
      .record(z.string(), z.any())
      .describe('Database icon, e.g. { type "emoji", emoji "📊" }.')
      .optional(),
    cover: z
      .record(z.string(), z.any())
      .describe("Database cover image (external file object).")
      .optional(),
    is_inline: z
      .boolean()
      .describe(
        "Display the database embedded in its parent page. Only valid when the parent is a page.",
      )
      .optional(),
    in_trash: z
      .boolean()
      .describe("Set true to archive (move to trash), false to restore.")
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
  name: "updateDatabase",
  title: "Update Database",
  description:
    "Update a database container's title, icon, cover, parent (move), inline flag, or trash state. Does NOT edit the row schema — that lives on the data source (updateDataSource).",
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
    const url = `https://api.notion.com/v1/databases/${encodeURIComponent(normalizeNotionId(input.database_id))}`;
    const body: Record<string, unknown> = {};
    if (input.title !== undefined) body["title"] = input.title;
    if (input.icon !== undefined) body["icon"] = input.icon;
    if (input.cover !== undefined) body["cover"] = input.cover;
    if (input.is_inline !== undefined) body["is_inline"] = input.is_inline;
    if (input.in_trash !== undefined) body["in_trash"] = input.in_trash;
    const res = await notionFetch(ctx.fetch, "updateDatabase", url, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
