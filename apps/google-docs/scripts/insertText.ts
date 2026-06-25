#!/usr/bin/env node
// batchUpdate-union request type (InsertText) posted to the shared :batchUpdate endpoint.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { batchUpdate } from "../lib/batchUpdate.ts";
import { locationOf } from "../lib/range.ts";
import { editSuccessOutput } from "../lib/schemas.ts";

const inputSchema = z
  .object({
    documentId: z
      .string()
      .describe(
        "Document id (the token in the doc URL). Resolve a title to an id with findDocuments.",
      ),
    text: z.string().describe("Text to insert."),
    index: z
      .number()
      .int()
      .describe(
        "Zero-based UTF-16 position to insert at. Must be >= 1 (index 0 is the reserved segment start) and inside an existing paragraph. Get positions from getDocument / findText — they go stale after any edit, so re-read before reusing.",
      ),
    tabId: z
      .string()
      .describe(
        "Optional target tab id (from getDocument). Omit for a single-tab document.",
      )
      .optional(),
    segmentId: z
      .string()
      .describe(
        "Optional segment to write into — a headerId / footerId / footnoteId from createHeader / createFooter / createFootnote (or getDocument's segments). Omit to target the document body. Each segment has its own index space.",
      )
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "insertText",
  title: "Insert Text",
  description:
    "Insert text at a specific index. Get the index from getDocument / findText; for appending to the end use appendText (no index math). Indices go stale after any edit — re-read before the next index-based call.",
  inputSchema,
  outputSchema: editSuccessOutput,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "google-docs",
  run: async (input, ctx) => {
    if (input.index < 1) {
      throw new Error(
        `Google Docs insertText: index must be >= 1 (index 0 is the reserved segment start). Got ${input.index}.`,
      );
    }
    await batchUpdate(
      ctx.fetch,
      input.documentId,
      [
        {
          insertText: {
            text: input.text,
            location: locationOf(input.index, input.tabId, input.segmentId),
          },
        },
      ],
      "insertText",
    );
    return { documentId: input.documentId, success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
