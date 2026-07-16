#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { notionFetch } from "../lib/notionFetch.ts";
import { normalizeNotionId } from "../lib/notionId.ts";

const inputSchema = z
  .object({
    data_source_id: z
      .string()
      .describe(
        "The data source id (a UUID with or without dashes, or a pasted Notion URL). Get it from getDatabase (data_sources[].id) or search (filter data_source).",
      ),
    title: z
      .array(z.record(z.string(), z.json()))
      .describe(
        "New data source title as a rich-text array. Omit to keep the current title.",
      )
      .optional(),
    properties: z
      .record(z.string(), z.json())
      .describe(
        'Schema changes keyed by existing property NAME. Each value is a property-definition object (e.g. { "select": { "options": [...] } }); set a value to null to delete that property. See references/notion-properties.md.',
      )
      .optional(),
  })
  .strict();
const outputSchema = z
  .object({
    object: z.literal("data_source"),
    id: z.string().describe("The data source id."),
    name: z.string().describe("The data source name.").optional(),
    properties: z
      .record(z.string(), z.json())
      .describe(
        "The property schema, keyed by property name. Each value defines the property's type, id, and options (e.g. select choices).",
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
  })
  .describe(
    "A Notion data source — the schema and rows of a database collection.",
  );

const definition = defineTool({
  name: "updateDataSource",
  title: "Update Data Source",
  description:
    "Update a data source's schema — add, rename, retype, or remove properties — or change its title. Property keys in the properties map are existing property names; set a value to null to remove that property.",
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
    const url = `https://api.notion.com/v1/data_sources/${encodeURIComponent(normalizeNotionId(input.data_source_id))}`;
    const body: Record<string, unknown> = {};
    if (input.title !== undefined) body["title"] = input.title;
    if (input.properties !== undefined) body["properties"] = input.properties;
    const res = await notionFetch(ctx.fetch, url, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
