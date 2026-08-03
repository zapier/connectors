#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    requests: z
      .array(
        z
          .object({
            indexName: z.string().describe("Index to query. From listIndices."),
            query: z.string().optional(),
            filters: z.string().optional(),
            facetFilters: z.array(z.any()).optional(),
            page: z.number().int().optional(),
            hitsPerPage: z.number().int().optional(),
          })
          .strict(),
      )
      .describe(
        "Query objects, each { indexName, query?, filters?, facetFilters?, page?, hitsPerPage? }.",
      ),
    strategy: z
      .enum(["none", "stopIfEnoughMatches"])
      .describe(
        "none = run all queries; stopIfEnoughMatches = stop early once enough results are found.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  results: z.array(
    z.object({
      indexName: z.string().nullable().optional(),
      hits: z.array(
        z
          .record(z.string(), z.any())
          .describe(
            "An Algolia record — arbitrary JSON attributes plus a string objectID (always present on reads).",
          ),
      ),
      nbHits: z.number().int(),
      page: z.number().int().nullable().optional(),
      nbPages: z.number().int().nullable().optional(),
      processingTimeMS: z.number().int().nullable().optional(),
    }),
  ),
});

const definition = defineTool({
  name: "searchMultipleIndices",
  title: "Search Multiple Indices",
  description:
    "Run several search queries in one request — across different indices or several queries against one index (federated search). results[i] aligns with requests[i].",
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
    const url = `https://application-id.algolia.net/1/indexes/*/queries`;
    const body: Record<string, unknown> = {};
    if (input.requests !== undefined) body["requests"] = input.requests;
    if (input.strategy !== undefined) body["strategy"] = input.strategy;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await ensureAlgoliaOk(res, "searchMultipleIndices");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
