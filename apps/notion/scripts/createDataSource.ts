#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { notionFetch } from "../lib/notionFetch.ts";

const inputSchema = z
  .object({
    parent: z
      .object({
        type: z.literal("database_id").optional(),
        database_id: z.string(),
      })
      .strict()
      .describe(
        'The parent database. Shape { type "database_id", database_id "<uuid>" }.',
      ),
    title: z
      .array(z.record(z.string(), z.any()))
      .describe("Data source title as a rich-text array.")
      .optional(),
    properties: z
      .record(z.string(), z.any())
      .describe(
        "The schema, keyed by property NAME. Must include exactly one title property. Each value is a property-definition object. See references/notion-properties.md.",
      ),
  })
  .strict();
const outputSchema = z
  .object({
    object: z.string().describe('Always "data_source".'),
    id: z.string().describe("The data source id (UUID)."),
    name: z.string().describe("The data source name.").optional(),
    properties: z
      .record(z.string(), z.any())
      .describe(
        "The property schema, keyed by property name. Each value defines the property's type, id, and options (e.g. select choices).",
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
  })
  .describe(
    "A Notion data source — the schema and rows of a database collection.",
  );

const definition = defineTool({
  name: "createDataSource",
  title: "Create Data Source",
  description:
    "Add a new data source (with its own property schema) to an existing database. Use when a database should hold more than one collection of rows.",
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
    const url = `https://api.notion.com/v1/data_sources`;
    const body: Record<string, unknown> = {};
    if (input.parent !== undefined) body["parent"] = input.parent;
    if (input.title !== undefined) body["title"] = input.title;
    if (input.properties !== undefined) body["properties"] = input.properties;
    const res = await notionFetch(ctx.fetch, "createDataSource", url, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
