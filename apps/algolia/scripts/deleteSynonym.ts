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
    objectID: z.string().describe("Synonym id to delete. From searchSynonyms."),
    forwardToReplicas: z
      .boolean()
      .describe("Apply to replicas too. Default false.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  taskID: z
    .number()
    .int()
    .describe("Async task id — poll getTask until published."),
  deletedAt: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "deleteSynonym",
  title: "Delete Synonym",
  description:
    "Delete a single synonym by id. Get objectID from searchSynonyms.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "algolia",
  run: async (input, ctx) => {
    const url = new URL(
      `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}/synonyms/${encodeURIComponent(input.objectID)}`,
    );
    if (input.forwardToReplicas !== undefined) {
      url.searchParams.set(
        "forwardToReplicas",
        String(input.forwardToReplicas),
      );
    }
    const res = await ctx.fetch(url.toString(), {
      method: "DELETE",
    });
    await ensureAlgoliaOk(res, "deleteSynonym");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
