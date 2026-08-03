#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    requests: z.array(
      z
        .object({
          action: z.enum([
            "addObject",
            "updateObject",
            "partialUpdateObject",
            "partialUpdateObjectNoCreate",
            "deleteObject",
            "delete",
            "clear",
          ]),
          indexName: z.string().describe("Index this operation targets."),
          body: z.record(z.string(), z.any()),
        })
        .strict(),
    ),
  })
  .strict();
const outputSchema = z.object({
  taskID: z
    .record(z.string(), z.number().int())
    .describe("indexName -> taskID."),
  objectIDs: z.array(z.string()).nullable().optional(),
});

const definition = defineTool({
  name: "multipleBatch",
  title: "Multiple Batch",
  description:
    "Run record operations across several indices in one request; each operation names its own indexName. The output taskID is a map of indexName to taskID (poll each separately).",
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
    const url = `https://application-id.algolia.net/1/indexes/*/batch`;
    const body: Record<string, unknown> = {};
    if (input.requests !== undefined) body["requests"] = input.requests;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await ensureAlgoliaOk(res, "multipleBatch");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
