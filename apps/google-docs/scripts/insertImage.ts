#!/usr/bin/env node
// Authored by the implementation agent: a batchUpdate-union request type
// (InsertInlineImage). The image is fetched by Google from the URL, not
// uploaded; run() pre-validates the URL and returns the new image's objectId.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { batchUpdate } from "../lib/batchUpdate.ts";
import { validateImageUrl } from "../lib/imageUrl.ts";
import { endOfSegment, locationOf } from "../lib/range.ts";

const inputSchema = z
  .object({
    documentId: z
      .string()
      .describe(
        "Document id (the token in the doc URL). Resolve a title to an id with findDocuments.",
      ),
    imageUrl: z
      .string()
      .describe(
        "Publicly accessible image URL — Google fetches it server-side at insertion time, so it must not require authentication. PNG, JPEG, or GIF only; under 50MB; at most 25 megapixels; URL at most 2kB.",
      ),
    index: z
      .number()
      .int()
      .describe(
        "Position to insert at (>= 1). Omit to append at the end of the body (no index math).",
      )
      .optional(),
    width: z
      .number()
      .describe("Display width in points. Omit for the image's native size.")
      .optional(),
    height: z
      .number()
      .describe("Display height in points. Omit for native size.")
      .optional(),
    tabId: z
      .string()
      .describe(
        "Optional target tab id (from getDocument). Omit for a single-tab document.",
      )
      .optional(),
    segmentId: z
      .string()
      .describe(
        "Optional segment to insert into — a headerId / footerId / footnoteId from createHeader / createFooter / createFootnote (or getDocument's segments). Omit for the document body.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  documentId: z.string().describe("The document that was edited."),
  objectId: z
    .string()
    .describe(
      "The new inline image's object id — pass as imageObjectId to replaceImage later.",
    ),
});

interface InsertImageReply {
  insertInlineImage?: { objectId?: string };
}

const definition = defineTool({
  name: "insertImage",
  title: "Insert Image",
  description:
    "Insert an inline image from a public URL at a position (or appended to the end if index is omitted). Google fetches the image server-side, so the URL must be publicly reachable. Returns the new image's objectId for a later replaceImage.",
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
    validateImageUrl(input.imageUrl, "insertImage");
    if (input.index !== undefined && input.index < 1) {
      throw new Error(
        `Google Docs insertImage: index must be >= 1 (index 0 is the reserved segment start). Got ${input.index}.`,
      );
    }

    const insertInlineImage: Record<string, unknown> = { uri: input.imageUrl };
    if (input.index !== undefined) {
      insertInlineImage.location = locationOf(
        input.index,
        input.tabId,
        input.segmentId,
      );
    } else {
      insertInlineImage.endOfSegmentLocation = endOfSegment(
        input.tabId,
        input.segmentId,
      );
    }
    if (input.width !== undefined || input.height !== undefined) {
      const objectSize: Record<string, unknown> = {};
      if (input.width !== undefined) {
        objectSize.width = { magnitude: input.width, unit: "PT" };
      }
      if (input.height !== undefined) {
        objectSize.height = { magnitude: input.height, unit: "PT" };
      }
      insertInlineImage.objectSize = objectSize;
    }

    const replies = await batchUpdate(
      ctx.fetch,
      input.documentId,
      [{ insertInlineImage }],
      "insertImage",
    );
    const objectId =
      (replies[0] as InsertImageReply | undefined)?.insertInlineImage
        ?.objectId ?? "";
    return { documentId: input.documentId, objectId };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
