// Shared output schema for the connector's "edit succeeded" tools.
//
// appendText, insertText, deleteContentRange, replaceImage, and
// updateDocumentStyle all return the same minimal acknowledgement — the
// batchUpdate is atomic, so a non-throwing call means the edit landed. Pinning
// one schema keeps that contract identical across every edit tool.

import { z } from "zod";

export const editSuccessOutput = z.object({
  documentId: z.string().describe("The document that was edited."),
  success: z
    .literal(true)
    .describe(
      "Always true on a non-throwing call — the batchUpdate is atomic, so the edit either fully applied or the call threw.",
    ),
});

export type EditSuccessOutput = z.infer<typeof editSuccessOutput>;
