#!/usr/bin/env node
// batchUpdate-union request type (CreateFooter). Creates a document-level DEFAULT footer and returns its
// segment id — write into it by passing that id as `segmentId` to insertText /
// formatText. Creating a footer when one already exists is a 400.
//
// NOTE: a newly-created footer segment has end index 1 (only the implicit
// trailing newline), leaving no valid insertion index for a follow-up
// insertText call. The `text` parameter works around this by writing content
// via endOfSegmentLocation in the same tool invocation.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { batchUpdate } from "../lib/batchUpdate.ts";

const inputSchema = z
  .object({
    documentId: z
      .string()
      .describe(
        "Document id (the token in the doc URL). Resolve a title to an id with findDocuments.",
      ),
    text: z
      .string()
      .describe(
        "Text to write into the footer. Always provide this — a newly-created footer segment has end index 1 with no valid insertion index, so this is the only supported way to populate it.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  documentId: z.string().describe("The document that was edited."),
  segmentId: z
    .string()
    .describe(
      "The new footer's segment id — pass as segmentId to formatText to style the footer text.",
    ),
});

interface CreateFooterReply {
  createFooter?: { footerId?: string };
}

const definition = defineTool({
  name: "createFooter",
  title: "Create Footer",
  description:
    "Create the document's default footer and return its segment id. Always supply text — newly-created footer segments have end index 1 with no valid insertion index, so text must be provided here. To style the footer afterward pass the returned segmentId to formatText. Fails if a default footer already exists.",
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
    const replies = await batchUpdate(
      ctx.fetch,
      input.documentId,
      [{ createFooter: { type: "DEFAULT" } }],
      "createFooter",
    );
    const segmentId =
      (replies[0] as CreateFooterReply | undefined)?.createFooter?.footerId ??
      "";
    if (input.text) {
      await batchUpdate(
        ctx.fetch,
        input.documentId,
        [
          {
            insertText: {
              text: input.text,
              endOfSegmentLocation: { segmentId },
            },
          },
        ],
        "createFooter",
      );
    }
    return { documentId: input.documentId, segmentId };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
