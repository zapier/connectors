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
        "The database container id (a UUID with or without dashes, or a pasted Notion URL). NOT a data source id. Resolve via search.",
      ),
  })
  .strict();
const outputSchema = z
  .object({
    object: z.literal("database"),
    id: z.string().describe("The database id."),
    title: z
      .array(z.record(z.string(), z.json()))
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
          .enum([
            "data_source_id",
            "page_id",
            "database_id",
            "block_id",
            "workspace",
          ])
          .describe("The kind of container this object belongs to.")
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
  name: "getDatabase",
  title: "Get Database",
  description:
    "Retrieve a database container by id. Returns the list of child data sources (id + name) — use a data source id with getDataSource (schema) or queryDataSource (rows). Does NOT return the row schema directly.",
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
    const url = `https://api.notion.com/v1/databases/${encodeURIComponent(normalizeNotionId(input.database_id))}`;
    const res = await notionFetch(ctx.fetch, url, {
      method: "GET",
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
