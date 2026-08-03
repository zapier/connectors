#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    indexName: z.string().describe("Index to delete. From listIndices."),
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
  name: "deleteIndex",
  title: "Delete Index",
  description:
    "Permanently delete an index, including its records, settings, synonyms, and rules. To empty records but keep config, use clearObjects.",
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
    const url = `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}`;
    const res = await ctx.fetch(url, {
      method: "DELETE",
    });
    await ensureAlgoliaOk(res, "deleteIndex");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
