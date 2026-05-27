#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const definition = defineTool({
  name: "search",
  title: "Search Notion",
  description:
    "Search Notion pages and databases by query string. Returns matching items with metadata (id, title, parent, url, last_edited_time).",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "The text query to search for in the user's Notion workspace. Searches both page titles and database titles.",
      ),
    filter: z
      .object({
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
    results: z.array(z.unknown()),
    next_cursor: z.string().nullable().optional(),
    has_more: z.boolean().optional(),
  }),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  statements: [
    {
      effect: "allow",
      permissions: ["can_execute"],
      resources: ["http"],
      conditions: [
        { path: ["method"], operator: "equals", value: "POST" },
        {
          path: ["url"],
          operator: "matches_url",
          value: "https://api.notion.com/v1/search",
        },
      ],
      label: "Search the connected Notion workspace",
    },
  ],
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
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Notion search ${res.status}: ${errBody}`);
    }
    return res.json() as Promise<{
      results: unknown[];
      next_cursor?: string | null;
      has_more?: boolean;
    }>;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
