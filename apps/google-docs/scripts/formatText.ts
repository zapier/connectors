#!/usr/bin/env node
// batchUpdate-union request type (UpdateTextStyle). run() assembles the textStyle from whichever inputs are set
// and builds the matching `fields` mask — the API requires `fields` to name
// every property being changed; an unset property is left untouched.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { batchUpdate } from "../lib/batchUpdate.ts";
import { hexToApiColor } from "../lib/color.ts";
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
    bold: z.boolean().describe("Set bold on/off.").optional(),
    italic: z.boolean().describe("Set italic on/off.").optional(),
    underline: z.boolean().describe("Set underline on/off.").optional(),
    strikethrough: z.boolean().describe("Set strikethrough on/off.").optional(),
    fontSize: z.number().describe("Font size in points.").optional(),
    fontFamily: z.string().describe("Font family name, e.g. Arial.").optional(),
    foregroundColor: z.string().describe("Text color as #RRGGBB.").optional(),
    backgroundColor: z
      .string()
      .describe("Highlight color as #RRGGBB.")
      .optional(),
    link: z.string().describe("URL to hyperlink the range to.").optional(),
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
  name: "formatText",
  title: "Format Text",
  description:
    "Apply character formatting (bold, italic, underline, strikethrough, font size/family, text/highlight color, or a hyperlink) to an index range. Provide at least one style. Operate on a range from findText / getDocument; indices go stale after edits.",
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
    const textStyle: Record<string, unknown> = {};
    const fields: string[] = [];

    if (input.bold !== undefined) {
      textStyle.bold = input.bold;
      fields.push("bold");
    }
    if (input.italic !== undefined) {
      textStyle.italic = input.italic;
      fields.push("italic");
    }
    if (input.underline !== undefined) {
      textStyle.underline = input.underline;
      fields.push("underline");
    }
    if (input.strikethrough !== undefined) {
      textStyle.strikethrough = input.strikethrough;
      fields.push("strikethrough");
    }
    if (input.fontSize !== undefined) {
      textStyle.fontSize = { magnitude: input.fontSize, unit: "PT" };
      fields.push("fontSize");
    }
    if (input.fontFamily !== undefined) {
      textStyle.weightedFontFamily = { fontFamily: input.fontFamily };
      fields.push("weightedFontFamily");
    }
    if (input.foregroundColor !== undefined) {
      textStyle.foregroundColor = hexToApiColor(
        input.foregroundColor,
        "foregroundColor",
      );
      fields.push("foregroundColor");
    }
    if (input.backgroundColor !== undefined) {
      textStyle.backgroundColor = hexToApiColor(
        input.backgroundColor,
        "backgroundColor",
      );
      fields.push("backgroundColor");
    }
    if (input.link !== undefined) {
      textStyle.link = { url: input.link };
      fields.push("link");
    }

    if (fields.length === 0) {
      throw new Error(
        "Google Docs formatText: provide at least one style to apply (bold, italic, underline, strikethrough, fontSize, fontFamily, foregroundColor, backgroundColor, or link).",
      );
    }

    await batchUpdate(
      ctx.fetch,
      input.documentId,
      [
        {
          updateTextStyle: {
            range: rangeOf(
              input.startIndex,
              input.endIndex,
              input.tabId,
              input.segmentId,
            ),
            textStyle,
            fields: fields.join(","),
          },
        },
      ],
      "formatText",
    );
    return { documentId: input.documentId, success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
