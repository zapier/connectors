#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    indexName: z
      .string()
      .describe("Index holding the synonym. From listIndices."),
    objectID: z.string().describe("Synonym id. From searchSynonyms."),
  })
  .strict();
const outputSchema = z.object({
  objectID: z.string(),
  type: z
    .string()
    .describe(
      "synonym / oneWaySynonym / altCorrection1 / altCorrection2 / placeholder.",
    ),
  synonyms: z.union([z.array(z.string()), z.null()]).optional(),
  input: z.union([z.string(), z.null()]).optional(),
  corrections: z.union([z.array(z.string()), z.null()]).optional(),
});

const definition = defineTool({
  name: "getSynonym",
  title: "Get Synonym",
  description:
    "Fetch a single synonym by id. Get objectID from searchSynonyms.",
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
    const url = `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}/synonyms/${encodeURIComponent(input.objectID)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await ensureAlgoliaOk(res, "getSynonym");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
