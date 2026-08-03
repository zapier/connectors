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
      .describe("Text to match synonyms against; omit to list all.")
      .optional(),
    type: z
      .string()
      .describe("Restrict to one synonym type (synonym, oneWaySynonym, ...).")
      .optional(),
    page: z.number().int().describe("Zero-based page.").optional(),
    hitsPerPage: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Synonyms per page. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  hits: z.array(
    z.object({
      objectID: z.string(),
      type: z
        .string()
        .describe(
          "synonym / oneWaySynonym / altCorrection1 / altCorrection2 / placeholder.",
        ),
      synonyms: z.union([z.array(z.string()), z.null()]).optional(),
      input: z.union([z.string(), z.null()]).optional(),
      corrections: z.union([z.array(z.string()), z.null()]).optional(),
    }),
  ),
  nbHits: z.number().int().nullable().optional(),
});

const definition = defineTool({
  name: "searchSynonyms",
  title: "Search Synonyms",
  description:
    "Search or list synonyms in an index. The resolver for synonym objectID (-> getSynonym / deleteSynonym). Omit query to list all.",
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
    const url = `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}/synonyms/search`;
    const body: Record<string, unknown> = {};
    if (input.query !== undefined) body["query"] = input.query;
    if (input.type !== undefined) body["type"] = input.type;
    if (input.page !== undefined) body["page"] = input.page;
    body["hitsPerPage"] = input.hitsPerPage ?? 20;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await ensureAlgoliaOk(res, "searchSynonyms");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
