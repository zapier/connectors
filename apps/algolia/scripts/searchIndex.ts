#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    indexName: z.string().describe("Index to search. From listIndices."),
    query: z
      .string()
      .describe(
        'Full-text query. Omit or "" to match all records (filters/relevance still apply).',
      )
      .optional(),
    filters: z
      .string()
      .describe(
        'Filter expression, e.g. category:Book AND price > 10. Quote spaced values: author:"John Doe".',
      )
      .optional(),
    facetFilters: z
      .array(z.any())
      .describe(
        'Facet filters; flat array = AND, nested array = OR, e.g. [["color:red","color:blue"],"size:M"].',
      )
      .optional(),
    numericFilters: z
      .array(z.string())
      .describe('Numeric/range filters, e.g. ["price>=10","price<=100"].')
      .optional(),
    page: z
      .number()
      .int()
      .describe(
        "Zero-based page. page*hitsPerPage must stay under paginationLimitedTo (default 1000); use browseObjects to read past it.",
      )
      .optional(),
    hitsPerPage: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Hits per page (1-1000). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    attributesToRetrieve: z
      .array(z.string())
      .describe(
        "Restrict which record attributes are returned (default: all retrievable).",
      )
      .optional(),
    facets: z
      .array(z.string())
      .describe(
        'Facets to compute counts for, e.g. ["brand","category"] or ["*"].',
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  hits: z
    .array(
      z
        .record(z.string(), z.any())
        .describe(
          "An Algolia record — arbitrary JSON attributes plus a string objectID (always present on reads).",
        ),
    )
    .describe("Matching records (each includes a string objectID)."),
  nbHits: z
    .number()
    .int()
    .describe("Total matching records (capped reporting on large sets)."),
  page: z.number().int().describe("Current zero-based page."),
  nbPages: z
    .number()
    .int()
    .describe("Total pages; page < nbPages-1 means more pages available."),
  hitsPerPage: z.number().int().nullable().optional(),
  processingTimeMS: z.number().int().nullable().optional(),
  query: z.string().nullable().optional(),
  facets: z
    .union([
      z
        .record(z.string(), z.any())
        .describe(
          "Facet counts when facets requested: facet name -> value -> count.",
        ),
      z
        .null()
        .describe(
          "Facet counts when facets requested: facet name -> value -> count.",
        ),
    ])
    .describe(
      "Facet counts when facets requested: facet name -> value -> count.",
    )
    .optional(),
  queryID: z
    .union([
      z.string().describe("Present when click analytics is enabled."),
      z.null().describe("Present when click analytics is enabled."),
    ])
    .describe("Present when click analytics is enabled.")
    .optional(),
});

const definition = defineTool({
  name: "searchIndex",
  title: "Search Index",
  description:
    "Search an index for records matching a query, with optional filters and facets. The primary read tool. Get indexName from listIndices.",
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
    const url = `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}/query`;
    const body: Record<string, unknown> = {};
    if (input.query !== undefined) body["query"] = input.query;
    if (input.filters !== undefined) body["filters"] = input.filters;
    if (input.facetFilters !== undefined)
      body["facetFilters"] = input.facetFilters;
    if (input.numericFilters !== undefined)
      body["numericFilters"] = input.numericFilters;
    if (input.page !== undefined) body["page"] = input.page;
    body["hitsPerPage"] = input.hitsPerPage ?? 20;
    if (input.attributesToRetrieve !== undefined)
      body["attributesToRetrieve"] = input.attributesToRetrieve;
    if (input.facets !== undefined) body["facets"] = input.facets;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await ensureAlgoliaOk(res, "searchIndex");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
