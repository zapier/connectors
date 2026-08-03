#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    requests: z
      .array(
        z
          .object({
            indexName: z
              .string()
              .describe("Index holding the record. From listIndices."),
            objectID: z
              .string()
              .describe(
                "Record id (string). From searchIndex / browseObjects.",
              ),
            attributesToRetrieve: z.array(z.string()).optional(),
          })
          .strict(),
      )
      .describe(
        "Lookup objects, each { indexName, objectID, attributesToRetrieve? }.",
      ),
  })
  .strict();
const outputSchema = z.object({
  results: z
    .array(
      z
        .record(z.string(), z.any())
        .describe(
          "An Algolia record — arbitrary JSON attributes plus a string objectID (always present on reads).",
        ),
    )
    .describe(
      "Each entry is the record, or null if that objectID was not found.",
    ),
});

const definition = defineTool({
  name: "getObjects",
  title: "Get Objects",
  description:
    "Retrieve multiple records by object ID in one request, optionally across indices. results[i] aligns with requests[i]; a missing id yields null at that position.",
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
    const url = `https://application-id.algolia.net/1/indexes/*/objects`;
    const body: Record<string, unknown> = {};
    if (input.requests !== undefined) body["requests"] = input.requests;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await ensureAlgoliaOk(res, "getObjects");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
