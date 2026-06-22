#!/usr/bin/env node
// Authored by the implementation agent: a batchUpdate-union request type
// (DeleteContentRange) posted to the shared :batchUpdate endpoint.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { batchUpdate } from "../lib/batchUpdate.ts";
import { rangeOf } from "../lib/range.ts";
import { editSuccessOutput } from "../lib/schemas.ts";

const inputSchema = z
  .object({
    documentId: z
      .string()
      .describe(
        "Document id (the token in the doc URL). Resolve a title to an id with findDocuments.",
      ),
    startIndex: z
      .number()
      .int()
      .describe(
        "Zero-based UTF-16 start of the range (inclusive). From findText / getDocument.",
      ),
    endIndex: z
      .number()
      .int()
      .describe(
        "End of the range (exclusive). Must not include the segment's implicit final newline — the API rejects deleting it.",
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
        "Optional segment the range is in — a headerId / footerId / footnoteId from createHeader / createFooter / createFootnote (or getDocument's segments). Omit for the document body.",
      )
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "deleteContentRange",
  title: "Delete Content Range",
  description:
    "Delete the content in an index range. Pairs with findText (resolve a phrase → range → delete). For 'delete this exact phrase everywhere', replaceAllText with an empty replace is simpler and needs no indices. Indices go stale after any edit.",
  inputSchema,
  outputSchema: editSuccessOutput,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "google-docs",
  run: async (input, ctx) => {
    await batchUpdate(
      ctx.fetch,
      input.documentId,
      [
        {
          deleteContentRange: {
            range: rangeOf(
              input.startIndex,
              input.endIndex,
              input.tabId,
              input.segmentId,
            ),
          },
        },
      ],
      "deleteContentRange",
    );
    return { documentId: input.documentId, success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
