#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    indexName: z
      .string()
      .describe("Index the model is trained on. From listIndices."),
    model: z
      .enum([
        "related-products",
        "bought-together",
        "looking-similar",
        "trending-items",
        "trending-facets",
      ])
      .describe("Recommendation model."),
    objectID: z
      .string()
      .describe(
        "Source record to recommend from. Required for related-products, bought-together, looking-similar.",
      )
      .optional(),
    facetName: z
      .string()
      .describe(
        "Facet to get trending values for. Required for trending-facets.",
      )
      .optional(),
    facetValue: z
      .string()
      .describe("Optional facet value to scope trending-facets.")
      .optional(),
    threshold: z
      .number()
      .describe(
        "Minimum recommendation score (0-100; default 0 = include all).",
      )
      .optional(),
    maxRecommendations: z
      .number()
      .int()
      .describe("Max recommendations (1-30; default 30).")
      .optional(),
    filters: z
      .string()
      .describe("Filter expression applied to recommendations.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  results: z.array(
    z.object({
      hits: z.array(
        z
          .record(z.string(), z.any())
          .describe(
            "An Algolia record — arbitrary JSON attributes plus a string objectID (always present on reads).",
          ),
      ),
      nbHits: z.number().int().nullable().optional(),
      processingTimeMS: z.number().int().nullable().optional(),
    }),
  ),
});

const definition = defineTool({
  name: "getRecommendations",
  title: "Get Recommendations",
  description:
    "Get AI recommendations for a record (related-products / bought-together / looking-similar, which need objectID) or trending values (trending-items; trending-facets needs facetName).",
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
    // The wire wraps a single request in { requests: [ ... ] }, and the required
    // fields are conditional on `model` — objectID for the item-based models,
    // facetName for trending-facets.
    const itemModels = [
      "related-products",
      "bought-together",
      "looking-similar",
    ];
    if (itemModels.includes(input.model) && !input.objectID?.trim()) {
      throw new Error(
        `Algolia getRecommendations: objectID is required for the "${input.model}" model (the record to recommend from). Provide the objectID of the source record.`,
      );
    }
    if (input.model === "trending-facets" && !input.facetName?.trim()) {
      throw new Error(
        `Algolia getRecommendations: facetName is required for the "trending-facets" model (the facet attribute to get trending values for, e.g. "brand").`,
      );
    }

    const request: Record<string, unknown> = {
      indexName: input.indexName,
      model: input.model,
      // Algolia requires threshold on every recommend request; default to 0 (include all).
      threshold: input.threshold ?? 0,
    };
    if (input.maxRecommendations !== undefined)
      request["maxRecommendations"] = input.maxRecommendations;
    if (input.model === "trending-facets") {
      request["facetName"] = input.facetName;
      if (input.facetValue !== undefined)
        request["facetValue"] = input.facetValue;
    } else if (itemModels.includes(input.model)) {
      request["objectID"] = input.objectID;
    }
    // filters ride under queryParameters (not allowed on trending-facets requests).
    if (input.filters !== undefined && input.model !== "trending-facets") {
      request["queryParameters"] = { filters: input.filters };
    }

    const url = `https://application-id.algolia.net/1/indexes/*/recommendations`;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [request] }),
    });
    await ensureAlgoliaOk(res, "getRecommendations");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
