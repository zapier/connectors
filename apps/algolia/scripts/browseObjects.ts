#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    indexName: z.string().describe("Index to browse. From listIndices."),
    cursor: z
      .string()
      .describe(
        "Cursor from a prior browseObjects response. Omit for the first page.",
      )
      .optional(),
    filters: z
      .string()
      .describe(
        "Optional filter to restrict the traversal (same DSL as searchIndex).",
      )
      .optional(),
    hitsPerPage: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Records per page (1-1000). Raise toward 1000 for bulk export. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  hits: z.array(
    z
      .record(z.string(), z.any())
      .describe(
        "An Algolia record — arbitrary JSON attributes plus a string objectID (always present on reads).",
      ),
  ),
  cursor: z
    .string()
    .nullable()
    .describe(
      "Present = more records (pass it back to continue); absent = traversal complete.",
    )
    .optional(),
  nbHits: z.number().int().nullable().optional(),
});

const definition = defineTool({
  name: "browseObjects",
  title: "Browse Objects",
  description:
    "Traverse all records in an index via a cursor — for export or reindex. Not relevance-ranked; reads past the 1000-hit search cap. Pass cursor to continue.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "algolia",
  run: async (input, ctx) => {
    const url = `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}/browse`;
    const body: Record<string, unknown> = {};
    if (input.cursor !== undefined) body["cursor"] = input.cursor;
    if (input.filters !== undefined) body["filters"] = input.filters;
    body["hitsPerPage"] = input.hitsPerPage ?? 20;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await ensureAlgoliaOk(res, "browseObjects");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
