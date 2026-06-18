#!/usr/bin/env node
// Authored by the implementation agent: a batchUpdate-union request type
// (UpdateDocumentStyle). run() assembles the documentStyle from whichever inputs
// are set and builds the matching `fields` mask (including nested paths like
// pageSize.width). Document-level — no tabId.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { batchUpdate } from "../lib/batchUpdate.ts";
import { hexToApiColor } from "../lib/color.ts";
import { editSuccessOutput } from "../lib/schemas.ts";

const inputSchema = z
  .object({
    documentId: z
      .string()
      .describe(
        "Document id (the token in the doc URL). Resolve a title to an id with findDocuments.",
      ),
    backgroundColor: z
      .string()
      .describe("Page background as #RRGGBB.")
      .optional(),
    pageWidth: z
      .number()
      .describe("Page width in points (e.g. 612 = US Letter).")
      .optional(),
    pageHeight: z
      .number()
      .describe("Page height in points (e.g. 792 = US Letter).")
      .optional(),
    marginTop: z.number().describe("Top margin in points.").optional(),
    marginBottom: z.number().describe("Bottom margin in points.").optional(),
    marginLeft: z.number().describe("Left margin in points.").optional(),
    marginRight: z.number().describe("Right margin in points.").optional(),
  })
  .strict();

function pt(magnitude: number): { magnitude: number; unit: "PT" } {
  return { magnitude, unit: "PT" };
}

const definition = defineTool({
  name: "updateDocumentStyle",
  title: "Update Document Style",
  description:
    "Set page size, margins, or background color for the whole document. Provide at least one. All dimensions are points (PT), not inches/cm — US Letter is 612×792, 1-inch margins are 72.",
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
    const documentStyle: Record<string, unknown> = {};
    const fields: string[] = [];

    if (input.backgroundColor !== undefined) {
      documentStyle.background = {
        color: hexToApiColor(input.backgroundColor, "backgroundColor"),
      };
      fields.push("background");
    }
    if (input.pageWidth !== undefined || input.pageHeight !== undefined) {
      const pageSize: Record<string, unknown> = {};
      if (input.pageWidth !== undefined) {
        pageSize.width = pt(input.pageWidth);
        fields.push("pageSize.width");
      }
      if (input.pageHeight !== undefined) {
        pageSize.height = pt(input.pageHeight);
        fields.push("pageSize.height");
      }
      documentStyle.pageSize = pageSize;
    }
    if (input.marginTop !== undefined) {
      documentStyle.marginTop = pt(input.marginTop);
      fields.push("marginTop");
    }
    if (input.marginBottom !== undefined) {
      documentStyle.marginBottom = pt(input.marginBottom);
      fields.push("marginBottom");
    }
    if (input.marginLeft !== undefined) {
      documentStyle.marginLeft = pt(input.marginLeft);
      fields.push("marginLeft");
    }
    if (input.marginRight !== undefined) {
      documentStyle.marginRight = pt(input.marginRight);
      fields.push("marginRight");
    }

    if (fields.length === 0) {
      throw new Error(
        "Google Docs updateDocumentStyle: provide at least one of backgroundColor, pageWidth, pageHeight, or a margin.",
      );
    }

    await batchUpdate(
      ctx.fetch,
      input.documentId,
      [{ updateDocumentStyle: { documentStyle, fields: fields.join(",") } }],
      "updateDocumentStyle",
    );
    return { documentId: input.documentId, success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
