#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const definition = defineTool({
  name: "search",
  title: "Search Notion",
  description:
    "Search Notion pages and databases by query string. Returns matching items with metadata (object type, id, url, parent, created/last-edited time) and each page's properties bag.",
  inputSchema: z.strictObject({
    query: z
      .string()
      .describe(
        "The text query to search for in the user's Notion workspace. Searches both page titles and database titles.",
      ),
    filter: z
      .strictObject({
        property: z.literal("object"),
        value: z.enum(["page", "database"]),
      })
      .optional()
      .describe(
        "Optional filter to limit results to either pages or databases. Omit to search both.",
      ),
    page_size: z.number().int().min(1).max(100).optional(),
    start_cursor: z.string().optional(),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        object: z.string().describe('The item type — "page" or "database".'),
        id: z.string(),
        url: z.string().optional(),
        created_time: z.string().optional(),
        last_edited_time: z.string().optional(),
        parent: z
          .object({ type: z.string() })
          .describe("The item's parent (workspace, page, or database).")
          .optional(),
        properties: z
          .record(z.string(), z.json())
          .describe(
            "Property values (pages) keyed by property name; shape depends on each property's type. Filter this down for large results.",
          )
          .optional(),
      }),
    ),
    next_cursor: z.string().nullable().optional(),
    has_more: z.boolean().optional(),
  }),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "notion",
  run: async (input, ctx) => {
    const res = await ctx.fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    await throwIfNotOk(res);
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
