#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    indexName: z.string().describe("Source index. From listIndices."),
    operation: z
      .enum(["copy", "move"])
      .describe(
        "copy duplicates the index; move renames it (deleting the source).",
      ),
    destination: z
      .string()
      .describe("Destination index name (its content is overwritten)."),
    scope: z
      .array(z.enum(["settings", "synonyms", "rules"]))
      .describe(
        "For copy only: restrict to these scopes (omit to copy records + all config).",
      )
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
  name: "copyOrMoveIndex",
  title: "Copy Or Move Index",
  description:
    "Copy or move (rename) an index within the application. Overwrites the destination. move is the atomic-reindex pattern (build temp, then move onto the live name).",
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
    const url = `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}/operation`;
    const body: Record<string, unknown> = {};
    if (input.operation !== undefined) body["operation"] = input.operation;
    if (input.destination !== undefined)
      body["destination"] = input.destination;
    if (input.scope !== undefined) body["scope"] = input.scope;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await ensureAlgoliaOk(res, "copyOrMoveIndex");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
