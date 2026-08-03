#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    indexName: z.string().describe("Index holding the rule. From listIndices."),
    objectID: z.string().describe("Rule id. From searchRules."),
  })
  .strict();
const outputSchema = z.object({
  objectID: z.string(),
  conditions: z
    .union([z.array(z.record(z.string(), z.any())), z.null()])
    .optional(),
  consequence: z.record(z.string(), z.any()),
  description: z.union([z.string(), z.null()]).optional(),
  enabled: z.boolean().nullable().optional(),
});

const definition = defineTool({
  name: "getRule",
  title: "Get Rule",
  description:
    "Fetch a single query rule by id. Get objectID from searchRules.",
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
    const url = `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}/rules/${encodeURIComponent(input.objectID)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await ensureAlgoliaOk(res, "getRule");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
