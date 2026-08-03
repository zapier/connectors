#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    indexName: z
      .string()
      .describe("Index the model belongs to. From listIndices."),
    model: z
      .enum([
        "related-products",
        "bought-together",
        "trending-items",
        "trending-facets",
      ])
      .describe("Recommend model."),
    query: z
      .string()
      .describe("Text to match rules against; omit to list all.")
      .optional(),
    page: z.number().int().describe("Zero-based page.").optional(),
    hitsPerPage: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Rules per page. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  hits: z.array(
    z.object({
      objectID: z.string(),
      condition: z.union([z.record(z.string(), z.any()), z.null()]).optional(),
      consequence: z
        .any()
        .nullable()
        .describe("Nested object — shape passes through.")
        .optional(),
      enabled: z.boolean().nullable().optional(),
      description: z.union([z.string(), z.null()]).optional(),
    }),
  ),
  nbHits: z.number().int().nullable().optional(),
});

const definition = defineTool({
  name: "searchRecommendRules",
  title: "Search Recommend Rules",
  description:
    "Search or list Recommend rules for an index and model. The resolver for Recommend rule objectID (-> getRecommendRule). Omit query to list all.",
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
    const url = `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}/${encodeURIComponent(input.model)}/recommend/rules/search`;
    const body: Record<string, unknown> = {};
    if (input.query !== undefined) body["query"] = input.query;
    if (input.page !== undefined) body["page"] = input.page;
    body["hitsPerPage"] = input.hitsPerPage ?? 20;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await ensureAlgoliaOk(res, "searchRecommendRules");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
