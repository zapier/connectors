#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    indexName: z.string().describe("Index to empty. From listIndices."),
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
  name: "clearObjects",
  title: "Clear Objects",
  description:
    "Delete ALL records in an index, keeping its settings, synonyms, and rules. Irreversible. To remove the index entirely (config included), use deleteIndex.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "algolia",
  run: async (input, ctx) => {
    const url = `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}/clear`;
    const res = await ctx.fetch(url, {
      method: "POST",
    });
    await ensureAlgoliaOk(res, "clearObjects");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
