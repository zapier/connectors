#!/usr/bin/env node
// Authored by the implementation agent: a batchUpdate-union request type
// (DeleteParagraphBullets) over a paragraph range. Strips bullets/numbers,
// leaving the paragraph text. Pairs with createList. Index-neutral.
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
        "Range start (inclusive), zero-based UTF-16. From findText / getDocument.",
      ),
    endIndex: z.number().int().describe("Range end (exclusive)."),
    tabId: z
      .string()
      .describe(
        "Optional target tab id (from getDocument). Omit for a single-tab document.",
      )
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "removeListFormatting",
  title: "Remove List Formatting",
  description:
    "Remove bullets or numbering from a range of paragraphs, leaving the text. The inverse of createList. Affects every paragraph the range overlaps.",
  inputSchema,
  outputSchema: editSuccessOutput,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-docs",
  run: async (input, ctx) => {
    await batchUpdate(
      ctx.fetch,
      input.documentId,
      [
        {
          deleteParagraphBullets: {
            range: rangeOf(input.startIndex, input.endIndex, input.tabId),
          },
        },
      ],
      "removeListFormatting",
    );
    return { documentId: input.documentId, success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
