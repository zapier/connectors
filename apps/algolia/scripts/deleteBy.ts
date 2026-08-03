#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    indexName: z.string().describe("Target index. From listIndices."),
    filters: z
      .string()
      .describe(
        "Filter expression selecting records to delete, e.g. category:obsolete.",
      )
      .optional(),
    facetFilters: z
      .array(z.any())
      .describe("Facet filters selecting records to delete.")
      .optional(),
    numericFilters: z
      .array(z.string())
      .describe("Numeric filters selecting records to delete.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  taskID: z
    .number()
    .int()
    .describe("Async task id — poll getTask until published."),
  updatedAt: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "deleteBy",
  title: "Delete By",
  description:
    "Delete all records in an index matching a filter. Irreversible and server-side. At least one filter is REQUIRED — an empty filter set deletes the whole index. Prefer for small sets.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "algolia",
  run: async (input, ctx) => {
    // Empty-filter guard: deleteBy with no filter
    // historically wiped the entire index. Require at least one filter here and
    // route an intentional "delete everything" to clearObjects instead.
    if (
      input.filters === undefined &&
      input.facetFilters === undefined &&
      input.numericFilters === undefined
    ) {
      throw new Error(
        "Algolia deleteBy: at least one of filters, facetFilters, or numericFilters is required — an empty filter set would delete every record. To intentionally empty an index, use clearObjects.",
      );
    }
    const url = `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}/deleteByQuery`;
    const body: Record<string, unknown> = {};
    if (input.filters !== undefined) body["filters"] = input.filters;
    if (input.facetFilters !== undefined)
      body["facetFilters"] = input.facetFilters;
    if (input.numericFilters !== undefined)
      body["numericFilters"] = input.numericFilters;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await ensureAlgoliaOk(res, "deleteBy");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
