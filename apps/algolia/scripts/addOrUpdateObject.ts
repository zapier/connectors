#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    indexName: z.string().describe("Target index. From listIndices."),
    objectID: z.string().describe("Record id to create or replace (string)."),
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
  objectID: z.string(),
  updatedAt: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "addOrUpdateObject",
  title: "Add Or Update Object",
  description:
    "Add or fully replace a record at a specific object ID (upsert). Replaces the entire record — use partialUpdateObject to change only some attributes.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "algolia",
  run: async (input, ctx) => {
    const url = `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}/${encodeURIComponent(input.objectID)}`;
    const body: Record<string, unknown> = {};
    if (input.record !== undefined) body["record"] = input.record;
    const res = await ctx.fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body.record),
    });
    await ensureAlgoliaOk(res, "addOrUpdateObject");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
