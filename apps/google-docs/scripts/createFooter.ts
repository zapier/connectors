#!/usr/bin/env node
// Authored by the implementation agent: a batchUpdate-union request type
// (CreateFooter). Creates a document-level DEFAULT footer and returns its
// segment id — write into it by passing that id as `segmentId` to insertText /
// formatText. Creating a footer when one already exists is a 400.
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
      "The new footer's segment id — pass as segmentId to insertText / formatText to write into the footer.",
    ),
});

interface CreateFooterReply {
  createFooter?: { footerId?: string };
}

const definition = defineTool({
  name: "createFooter",
  title: "Create Footer",
  description:
    "Create the document's default footer and return its segment id. Write into it by passing that id as segmentId to insertText. Fails if a default footer already exists.",
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
    return { documentId: input.documentId, segmentId };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
