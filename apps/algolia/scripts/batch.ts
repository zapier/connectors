#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    indexName: z.string().describe("Target index. From listIndices."),
    requests: z
      .array(
        z
          .object({
            action: z
              .enum([
                "addObject",
                "updateObject",
                "partialUpdateObject",
                "partialUpdateObjectNoCreate",
                "deleteObject",
                "delete",
                "clear",
              ])
              .describe("The operation for this entry."),
            body: z
              .record(z.string(), z.any())
              .describe("The record (include objectID for update/delete)."),
          })
          .strict(),
      )
      .describe("Operations applied in order."),
  })
  .strict();
const outputSchema = z.object({
  taskID: z.number().int(),
  objectIDs: z.array(z.string()).nullable().optional(),
});

const definition = defineTool({
  name: "batch",
  title: "Batch",
  description:
    "Run many record operations (add/update/partial-update/delete) against one index in one request. Keep under ~10MB / 1000-10000 records; one oversized record rejects the batch.",
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
    const url = `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}/batch`;
    const body: Record<string, unknown> = {};
    if (input.requests !== undefined) body["requests"] = input.requests;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await ensureAlgoliaOk(res, "batch");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
