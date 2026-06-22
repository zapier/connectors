#!/usr/bin/env node
// Authored by the implementation agent: a batchUpdate-union request type
// (UpdateParagraphStyle). run() assembles the paragraphStyle from whichever
// inputs are set and builds the matching `fields` mask (shared with the Markdown
// renderer via lib/paragraph.ts) — the API requires `fields` to name every
// property being changed; an unset property is left untouched. Index-neutral.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { batchUpdate } from "../lib/batchUpdate.ts";
import { buildParagraphStyle } from "../lib/paragraph.ts";
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
    namedStyle: z
      .enum([
        "normal",
        "title",
        "subtitle",
        "heading1",
        "heading2",
        "heading3",
        "heading4",
        "heading5",
        "heading6",
      ])
      .describe(
        "Paragraph named style. Use heading1..heading6 to make existing text a heading; normal to clear back to body text.",
      )
      .optional(),
    alignment: z
      .enum(["left", "center", "right", "justified"])
      .describe("Horizontal alignment.")
      .optional(),
    lineSpacing: z
      .number()
      .describe(
        "Line spacing as a percent of single: 100 = single, 150 = 1.5x, 200 = double.",
      )
      .optional(),
    spaceAbove: z
      .number()
      .describe("Space before the paragraph, in points.")
      .optional(),
    spaceBelow: z
      .number()
      .describe("Space after the paragraph, in points.")
      .optional(),
    indentStart: z
      .number()
      .describe("Left indent (start edge, LTR), in points.")
      .optional(),
    indentFirstLine: z
      .number()
      .describe("First-line indent, in points.")
      .optional(),
    tabId: z
      .string()
      .describe(
        "Optional target tab id (from getDocument). Omit for a single-tab document.",
      )
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "formatParagraph",
  title: "Format Paragraph",
  description:
    "Apply paragraph-level formatting (named style like Heading 2, alignment, line spacing, space above/below, indentation) to a range. Provide at least one. Affects every paragraph the range overlaps; indices go stale after edits.",
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
    const { paragraphStyle, fields } = buildParagraphStyle(input);

    if (fields.length === 0) {
      throw new Error(
        "Google Docs formatParagraph: provide at least one style to apply (namedStyle, alignment, lineSpacing, spaceAbove, spaceBelow, indentStart, or indentFirstLine).",
      );
    }

    await batchUpdate(
      ctx.fetch,
      input.documentId,
      [
        {
          updateParagraphStyle: {
            range: rangeOf(input.startIndex, input.endIndex, input.tabId),
            paragraphStyle,
            fields: fields.join(","),
          },
        },
      ],
      "formatParagraph",
    );
    return { documentId: input.documentId, success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
