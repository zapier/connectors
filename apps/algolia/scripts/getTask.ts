#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    indexName: z
      .string()
      .describe(
        "Index the task ran against. From listIndices or the index you wrote to.",
      ),
    taskID: z
      .number()
      .int()
      .describe(
        "Task id returned by a prior write tool (saveObject, batch, setSettings, ...).",
      ),
  })
  .strict();
const outputSchema = z.object({
  status: z
    .enum(["published", "notPublished"])
    .describe(
      "published = applied and searchable; notPublished = still processing.",
    ),
  pendingTask: z.boolean().nullable().optional(),
});

const definition = defineTool({
  name: "getTask",
  title: "Get Task",
  description:
    "Check an async indexing task's status — how you confirm a prior write was applied. Poll until status is published before asserting the write is searchable.",
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
    const url = `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}/task/${encodeURIComponent(input.taskID)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await ensureAlgoliaOk(res, "getTask");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
