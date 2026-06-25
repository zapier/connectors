#!/usr/bin/env node
// batchUpdate-union request type (CreateFootnote). Inserts a footnote reference at a body index (shifting
// following indices by the reference mark) and returns the new footnote
// segment id — write the footnote's text by passing that id as `segmentId` to
// insertText. Footnotes can't be created inside headers/footers/footnotes.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { batchUpdate } from "../lib/batchUpdate.ts";
import { endOfSegment, locationOf } from "../lib/range.ts";

const inputSchema = z
  .object({
    documentId: z
      .string()
      .describe(
        "Document id (the token in the doc URL). Resolve a title to an id with findDocuments.",
      ),
    index: z
      .number()
      .int()
      .describe(
        "Body position (>= 1) to place the footnote reference mark. Omit to append at the end of the body. Inserting the mark shifts following indices by one.",
      )
      .optional(),
    tabId: z
      .string()
      .describe(
        "Optional target tab id (from getDocument). Omit for a single-tab document.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  documentId: z.string().describe("The document that was edited."),
  segmentId: z
    .string()
    .describe(
      "The new footnote's segment id — pass as segmentId to insertText to write the footnote's text.",
    ),
});

interface CreateFootnoteReply {
  createFootnote?: { footnoteId?: string };
}

const definition = defineTool({
  name: "createFootnote",
  title: "Create Footnote",
  description:
    "Insert a footnote reference at a body position and return the new footnote's segment id. Write the footnote text by passing that id as segmentId to insertText. Omit index to append the reference at the end.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "google-docs",
  run: async (input, ctx) => {
    if (input.index !== undefined && input.index < 1) {
      throw new Error(
        `Google Docs createFootnote: index must be >= 1 (index 0 is the reserved segment start). Got ${input.index}.`,
      );
    }
    const createFootnote: Record<string, unknown> =
      input.index !== undefined
        ? { location: locationOf(input.index, input.tabId) }
        : { endOfSegmentLocation: endOfSegment(input.tabId) };

    const replies = await batchUpdate(
      ctx.fetch,
      input.documentId,
      [{ createFootnote }],
      "createFootnote",
    );
    const segmentId =
      (replies[0] as CreateFootnoteReply | undefined)?.createFootnote
        ?.footnoteId ?? "";
    return { documentId: input.documentId, segmentId };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
