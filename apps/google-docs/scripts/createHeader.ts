#!/usr/bin/env node
// Authored by the implementation agent: a batchUpdate-union request type
// (CreateHeader). Creates a document-level DEFAULT header and returns its
// segment id — write into it by passing that id as `segmentId` to insertText /
// formatText. Creating a header when one already exists is a 400 (the API's
// documented behavior).
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
  })
  .strict();

const outputSchema = z.object({
  documentId: z.string().describe("The document that was edited."),
  segmentId: z
    .string()
    .describe(
      "The new header's segment id — pass as segmentId to insertText / formatText to write into the header.",
    ),
});

interface CreateHeaderReply {
  createHeader?: { headerId?: string };
}

const definition = defineTool({
  name: "createHeader",
  title: "Create Header",
  description:
    "Create the document's default header and return its segment id. Write into it by passing that id as segmentId to insertText. Fails if a default header already exists.",
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
    return { documentId: input.documentId, segmentId };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
