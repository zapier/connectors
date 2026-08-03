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
      .describe("Recommend model the rule is scoped to."),
    objectID: z
      .string()
      .describe("Recommend rule id. From searchRecommendRules."),
  })
  .strict();
const outputSchema = z.object({
  objectID: z.string(),
  condition: z.union([z.record(z.string(), z.any()), z.null()]).optional(),
  consequence: z.record(z.string(), z.any()).nullable().optional(),
  enabled: z.boolean().nullable().optional(),
  description: z.union([z.string(), z.null()]).optional(),
});

const definition = defineTool({
  name: "getRecommendRule",
  title: "Get Recommend Rule",
  description:
    "Fetch a single Recommend rule by id (Recommend rules curate or pin recommendation results). Get objectID from searchRecommendRules.",
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
    const url = `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}/${encodeURIComponent(input.model)}/recommend/rules/${encodeURIComponent(input.objectID)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await ensureAlgoliaOk(res, "getRecommendRule");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
