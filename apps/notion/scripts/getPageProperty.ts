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
    property_id: z
      .string()
      .describe(
        "The property id (not name) from the data source schema (getDataSource).",
      ),
    page_size: z
      .number()
      .int()
      .lte(100)
      .describe("Results per page for paginated property values (max 100).")
      .optional(),
    start_cursor: z
      .string()
      .describe("Pagination cursor from a previous response.")
      .optional(),
  })
  .strict();
const outputSchema = z
  .object({
    object: z.string().describe('"property_item" or "list".'),
    type: z.string().describe("The property type (e.g. relation").optional(),
    next_cursor: z.union([z.string(), z.null()]).optional(),
    has_more: z.boolean().optional(),
  })
  .catchall(z.json());

const definition = defineTool({
  name: "getPageProperty",
  title: "Get Page Property",
  description:
    "Retrieve a single property value for a page, paginated. Use for properties that may exceed 25 references (relations, rollups, people) where getPage truncates the value.",
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
    const url = new URL(
      `https://api.notion.com/v1/pages/${encodeURIComponent(normalizeNotionId(input.page_id))}/properties/${encodeURIComponent(input.property_id)}`,
    );
    if (input.page_size !== undefined) {
      url.searchParams.set("page_size", String(input.page_size));
    }
    if (input.start_cursor !== undefined) {
      url.searchParams.set("start_cursor", String(input.start_cursor));
    }
    const res = await notionFetch(
      ctx.fetch,
      "getPageProperty",
      url.toString(),
      {
        method: "GET",
      },
    );
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
