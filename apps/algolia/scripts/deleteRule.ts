#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    indexName: z.string().describe("Index holding the rule. From listIndices."),
    objectID: z.string().describe("Rule id to delete. From searchRules."),
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
  updatedAt: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "deleteRule",
  title: "Delete Rule",
  description:
    "Delete a single query rule by id. Get objectID from searchRules.",
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
      `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}/rules/${encodeURIComponent(input.objectID)}`,
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
    await ensureAlgoliaOk(res, "deleteRule");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
