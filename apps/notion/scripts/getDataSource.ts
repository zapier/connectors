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
        "The data source id (UUID). Get it from getDatabase (data_sources[].id) or search (filter data_source).",
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
  name: "getDataSource",
  title: "Get Data Source",
  description:
    "Retrieve a data source's schema — its property definitions (names, types, ids) and configured options (select/status choices). Read this before createPage or queryDataSource to learn valid property keys, types, and option values.",
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
    const url = `https://api.notion.com/v1/data_sources/${encodeURIComponent(normalizeNotionId(input.data_source_id))}`;
    const res = await notionFetch(ctx.fetch, "getDataSource", url, {
      method: "GET",
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
