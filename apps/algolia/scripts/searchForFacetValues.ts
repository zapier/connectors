#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    indexName: z.string().describe("Index to search. From listIndices."),
    facetName: z
      .string()
      .describe(
        "Faceted attribute to search. Must be searchable in attributesForFaceting — see getSettings.",
      ),
    facetQuery: z
      .string()
      .describe("Prefix/substring to match facet values against, e.g. nik.")
      .optional(),
    maxFacetHits: z
      .number()
      .int()
      .describe("Max facet values to return (1-100; default 10).")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  facetHits: z.array(
    z.object({
      value: z.string(),
      highlighted: z.string().nullable().optional(),
      count: z.number().int(),
    }),
  ),
  exhaustiveFacetsCount: z.boolean().nullable().optional(),
});

const definition = defineTool({
  name: "searchForFacetValues",
  title: "Search For Facet Values",
  description:
    'Search the values of one faceted attribute (e.g. brands starting with "nik"). The facet must be in the index\'s attributesForFaceting as searchable(...) — discover via getSettings.',
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
    const url = `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}/facets/${encodeURIComponent(input.facetName)}/query`;
    const body: Record<string, unknown> = {};
    if (input.facetQuery !== undefined) body["facetQuery"] = input.facetQuery;
    if (input.maxFacetHits !== undefined)
      body["maxFacetHits"] = input.maxFacetHits;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await ensureAlgoliaOk(res, "searchForFacetValues");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
