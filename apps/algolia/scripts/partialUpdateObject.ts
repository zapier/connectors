#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    indexName: z.string().describe("Target index. From listIndices."),
    objectID: z
      .string()
      .describe(
        "Record id to patch (string). From searchIndex / browseObjects.",
      ),
    attributes: z
      .record(z.string(), z.any())
      .describe(
        "Attributes to add or update. Only these change; other attributes are untouched.",
      ),
    createIfNotExists: z
      .boolean()
      .describe(
        "true (default) creates the record if objectID is missing; false makes a patch to a missing id a silent no-op.",
      )
      .optional(),
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
  name: "partialUpdateObject",
  title: "Partial Update Object",
  description:
    "Update or add specific attributes on a record without replacing the whole record. Only the supplied attributes change. createIfNotExists defaults to true (creates if missing).",
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
    const url = new URL(
      `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}/${encodeURIComponent(input.objectID)}/partial`,
    );
    if (input.createIfNotExists !== undefined) {
      url.searchParams.set(
        "createIfNotExists",
        String(input.createIfNotExists),
      );
    }
    const body: Record<string, unknown> = {};
    if (input.attributes !== undefined) body["attributes"] = input.attributes;
    const res = await ctx.fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body.attributes),
    });
    await ensureAlgoliaOk(res, "partialUpdateObject");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
