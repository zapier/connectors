#!/usr/bin/env node
// batchUpdate-union request type (CreateHeader). Creates a document-level DEFAULT header and returns its
// segment id — write into it by passing that id as `segmentId` to insertText /
// formatText. Creating a header when one already exists is a 400 (the API's
// documented behavior).
//
// NOTE: a newly-created header segment has end index 1 (only the implicit
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
        "Text to write into the header. Always provide this — a newly-created header segment has end index 1 with no valid insertion index, so this is the only supported way to populate it.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  documentId: z.string().describe("The document that was edited."),
  segmentId: z
    .string()
    .describe(
      "The new header's segment id — pass as segmentId to formatText to style the header text.",
    ),
});

interface CreateHeaderReply {
  createHeader?: { headerId?: string };
}

const definition = defineTool({
  name: "createHeader",
  title: "Create Header",
  description:
    "Create the document's default header and return its segment id. Always supply text — newly-created header segments have end index 1 with no valid insertion index, so text must be provided here. To style the header afterward pass the returned segmentId to formatText. Fails if a default header already exists.",
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
      [{ createHeader: { type: "DEFAULT" } }],
      "createHeader",
    );
    const segmentId =
      (replies[0] as CreateHeaderReply | undefined)?.createHeader?.headerId ??
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
        "createHeader",
      );
    }
    return { documentId: input.documentId, segmentId };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
