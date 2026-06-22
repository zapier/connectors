#!/usr/bin/env node
// Authored by the implementation agent: batchUpdate-union request types
// (DeleteParagraphBullets + CreateParagraphBullets) over a paragraph range.
// Applies a list to plain paragraphs OR converts an existing list between
// bulleted and numbered — the leading DeleteParagraphBullets is a no-op on
// non-list paragraphs, so one path covers both. Bullets are index-neutral
// (applying/removing them does not shift indices), so both requests can ride one
// atomic batch. Nesting levels (leading-tab normalization) are index-mutating and
// land with the eval harness — this tool ships flat lists.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { batchUpdate } from "../lib/batchUpdate.ts";
import { bulletPresetFor } from "../lib/paragraph.ts";
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
    style: z
      .enum(["bullet", "numbered"])
      .describe(
        "List style: bullet (default) or numbered. Applying a style to an existing list of the other style converts it.",
      )
      .default("bullet"),
    tabId: z
      .string()
      .describe(
        "Optional target tab id (from getDocument). Omit for a single-tab document.",
      )
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "createList",
  title: "Create List",
  description:
    "Turn a range of paragraphs into a bulleted or numbered list — or convert an existing list between the two. Affects every paragraph the range overlaps. Operate on a range from findText / getDocument; indices go stale after edits.",
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
    const range = rangeOf(input.startIndex, input.endIndex, input.tabId);
    // Delete-then-create in one atomic batch: the delete is a documented no-op on
    // paragraphs that aren't already a list, so this single path both applies a
    // fresh list and converts an existing list to the requested style.
    await batchUpdate(
      ctx.fetch,
      input.documentId,
      [
        { deleteParagraphBullets: { range } },
        {
          createParagraphBullets: {
            range,
            bulletPreset: bulletPresetFor(input.style),
          },
        },
      ],
      "createList",
    );
    return { documentId: input.documentId, success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
