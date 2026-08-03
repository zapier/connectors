#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    indexName: z
      .string()
      .describe("Index holding the record. From listIndices."),
    objectID: z
      .string()
      .describe(
        "Record id to delete (string). From searchIndex / browseObjects.",
      ),
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
  name: "deleteObject",
  title: "Delete Object",
  description:
    "Delete a single record by object ID. Idempotent — deleting a missing id still returns a taskID. To delete by filter use deleteBy; to wipe an index use clearObjects.",
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
    const url = `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}/${encodeURIComponent(input.objectID)}`;
    const res = await ctx.fetch(url, {
      method: "DELETE",
    });
    await ensureAlgoliaOk(res, "deleteObject");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
