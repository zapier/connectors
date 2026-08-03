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
        "Record id (string; never numeric). From searchIndex / browseObjects.",
      ),
    attributesToRetrieve: z
      .array(z.string())
      .describe("Restrict which attributes are returned.")
      .optional(),
  })
  .strict();
const outputSchema = z
  .object({
    objectID: z.string().describe("The record's object id (always present)."),
  })
  .catchall(z.json())
  .describe(
    "An Algolia record — the string objectID plus arbitrary JSON attributes.",
  );

const definition = defineTool({
  name: "getObject",
  title: "Get Object",
  description:
    "Retrieve a single record by its object ID. Get objectID from searchIndex or browseObjects. Returns 404 if the record does not exist.",
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
    const url = new URL(
      `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}/${encodeURIComponent(input.objectID)}`,
    );
    if (input.attributesToRetrieve !== undefined) {
      url.searchParams.set(
        "attributesToRetrieve",
        String(input.attributesToRetrieve),
      );
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await ensureAlgoliaOk(res, "getObject");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
