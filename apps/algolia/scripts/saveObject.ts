#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    indexName: z.string().describe("Target index. From listIndices."),
    record: z
      .record(z.string(), z.any())
      .describe(
        "An Algolia record — arbitrary JSON attributes plus a string objectID (always present on reads).",
      ),
  })
  .strict();
const outputSchema = z.object({
  taskID: z
    .number()
    .int()
    .describe("Async task id — poll getTask until published."),
  objectID: z
    .string()
    .describe("The record's object id (generated if you omitted one)."),
  createdAt: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "saveObject",
  title: "Save Object",
  description:
    "Add a new record to an index; Algolia assigns an objectID if the record omits one. Include objectID in record to set it yourself. The index is created on first write.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "algolia",
  run: async (input, ctx) => {
    const url = `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}`;
    const body: Record<string, unknown> = {};
    if (input.record !== undefined) body["record"] = input.record;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body.record),
    });
    await ensureAlgoliaOk(res, "saveObject");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
