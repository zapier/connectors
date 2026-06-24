#!/usr/bin/env node
// Authored by the implementation agent: a batchUpdate-union request type
// (ReplaceImage). Same public-fetch + format rules as insertImage.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { batchUpdate } from "../lib/batchUpdate.ts";
import { validateImageUrl } from "../lib/imageUrl.ts";
import { editSuccessOutput } from "../lib/schemas.ts";

const inputSchema = z
  .object({
    documentId: z
      .string()
      .describe(
        "Document id (the token in the doc URL). Resolve a title to an id with findDocuments.",
      ),
    imageObjectId: z
      .string()
      .describe(
        "Object id of the image to replace. Get it from getDocument (inlineObjects keys) or insertImage's output. Re-read with getDocument if the document may have changed since you obtained it.",
      ),
    imageUrl: z
      .string()
      .describe(
        "New image URL. Same public-fetch + format rules as insertImage: PNG/JPEG/GIF, publicly fetchable, <=2kB URL, <50MB, <=25MP.",
      ),
    tabId: z
      .string()
      .describe(
        "Optional tab the image is in (from getDocument). Omit for a single-tab document.",
      )
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "replaceImage",
  title: "Replace Image",
  description:
    "Replace an existing inline image with a new one from a public URL (scales/crops to the original's dimensions). Get imageObjectId from getDocument (inlineObjects keys) or a prior insertImage.",
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
    validateImageUrl(input.imageUrl, "replaceImage");
    const replaceImage: Record<string, unknown> = {
      imageObjectId: input.imageObjectId,
      uri: input.imageUrl,
    };
    if (input.tabId) replaceImage.tabId = input.tabId;

    await batchUpdate(
      ctx.fetch,
      input.documentId,
      [{ replaceImage }],
      "replaceImage",
    );
    return { documentId: input.documentId, success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
