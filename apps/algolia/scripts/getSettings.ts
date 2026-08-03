#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    indexName: z
      .string()
      .describe("Index whose settings to read. From listIndices."),
  })
  .strict();
const outputSchema = z.object({
  searchableAttributes: z.array(z.string()).nullable().optional(),
  attributesForFaceting: z
    .array(z.string())
    .nullable()
    .describe(
      "Which attributes can be faceted/filtered — the discovery path for searchForFacetValues and filters.",
    )
    .optional(),
  attributesToRetrieve: z.array(z.string()).nullable().optional(),
  ranking: z.array(z.string()).nullable().optional(),
  customRanking: z.array(z.string()).nullable().optional(),
  replicas: z.array(z.string()).nullable().optional(),
  attributesToHighlight: z.array(z.string()).nullable().optional(),
  attributesToSnippet: z.array(z.string()).nullable().optional(),
  paginationLimitedTo: z
    .number()
    .int()
    .nullable()
    .describe("Max hits reachable via page-based search (default 1000).")
    .optional(),
  typoTolerance: z
    .string()
    .nullable()
    .describe("true/false/min/strict (returned as string or boolean).")
    .optional(),
  removeStopWords: z.string().nullable().optional(),
  queryLanguages: z.array(z.string()).nullable().optional(),
  distinct: z.number().int().nullable().optional(),
  relevancyStrictness: z.number().int().nullable().optional(),
});

const definition = defineTool({
  name: "getSettings",
  title: "Get Settings",
  description:
    "Retrieve an index's settings — the relevance, faceting, and ranking configuration. attributesForFaceting lists which attributes can be filtered/faceted.",
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
    const url = `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}/settings`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await ensureAlgoliaOk(res, "getSettings");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
